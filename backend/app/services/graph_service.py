"""Graph management: DAG validation, cycle detection, patch operations using NetworkX."""

from typing import Any, Optional

import networkx as nx

from app.schemas.schemas import GraphEdge, GraphNode, GraphPatchRequest, ValidationError


def build_graph(graph_json: dict[str, Any]) -> nx.DiGraph:
    """Build a NetworkX DiGraph from a graph JSON object.

    Args:
        graph_json: dict with "nodes" (list of {id, label}) and "edges" (list of {source, target, weight}).

    Returns:
        Populated NetworkX DiGraph.
    """
    G = nx.DiGraph()
    for node in graph_json.get("nodes", []):
        G.add_node(node["id"], label=node.get("label", node["id"]))
    for edge in graph_json.get("edges", []):
        G.add_edge(edge["source"], edge["target"], weight=edge.get("weight", 0.5))
    return G


def graph_to_json(G: nx.DiGraph) -> dict[str, Any]:
    """Convert a NetworkX DiGraph back to graph JSON format."""
    nodes = [{"id": n, "label": G.nodes[n].get("label", n)} for n in G.nodes]
    edges = [
        {"source": u, "target": v, "weight": d.get("weight", 0.5)}
        for u, v, d in G.edges(data=True)
    ]
    return {"nodes": nodes, "edges": edges}


def validate_graph(graph_json: dict[str, Any]) -> tuple[bool, list[ValidationError], Optional[list[str]]]:
    """Validate a concept dependency graph.

    Checks:
    - Graph is a DAG (no cycles)
    - All edge endpoints reference existing nodes
    - Edge weights are in [0, 1]

    Returns:
        Tuple of (is_valid, errors, cycle_path_or_none).
    """
    errors: list[ValidationError] = []
    node_ids = {n["id"] for n in graph_json.get("nodes", [])}

    # Check edge references and weights
    for i, edge in enumerate(graph_json.get("edges", [])):
        if edge["source"] not in node_ids:
            errors.append(ValidationError(
                row=i, field="source",
                message=f"Edge source '{edge['source']}' is not a defined node",
            ))
        if edge["target"] not in node_ids:
            errors.append(ValidationError(
                row=i, field="target",
                message=f"Edge target '{edge['target']}' is not a defined node",
            ))
        weight = edge.get("weight", 0.5)
        if weight < 0 or weight > 1:
            errors.append(ValidationError(
                row=i, field="weight",
                message=f"Edge weight must be in [0, 1], got {weight}",
            ))

    if errors:
        return False, errors, None

    # Build graph and check DAG
    G = build_graph(graph_json)
    if not nx.is_directed_acyclic_graph(G):
        cycle = _find_cycle(G)
        errors.append(ValidationError(
            message=f"Graph contains a cycle: {' -> '.join(cycle)}",
        ))
        return False, errors, cycle

    return True, [], None


def _find_cycle(G: nx.DiGraph) -> list[str]:
    """Find and return a cycle path in the graph."""
    try:
        cycle_edges = nx.find_cycle(G, orientation="original")
        return [e[0] for e in cycle_edges] + [cycle_edges[-1][1]]
    except nx.NetworkXNoCycle:
        return []


def get_topological_order(G: nx.DiGraph) -> list[str]:
    """Return concepts in topological order (leaves first)."""
    return list(nx.topological_sort(G))


def apply_patch(
    graph_json: dict[str, Any],
    patch: GraphPatchRequest,
) -> tuple[dict[str, Any], bool, Optional[list[str]], list[ValidationError]]:
    """Apply add/remove operations to a graph and re-validate.

    Returns:
        Tuple of (updated_graph_json, is_dag, cycle_path, errors).
    """
    errors: list[ValidationError] = []
    G = build_graph(graph_json)

    # Add nodes
    for node in patch.add_nodes:
        if node.id in G.nodes:
            errors.append(ValidationError(
                field="add_nodes",
                message=f"Node '{node.id}' already exists",
            ))
        else:
            G.add_node(node.id, label=node.label)

    # Remove nodes
    for node_id in patch.remove_nodes:
        if node_id not in G.nodes:
            errors.append(ValidationError(
                field="remove_nodes",
                message=f"Node '{node_id}' does not exist",
            ))
        else:
            G.remove_node(node_id)

    # Add edges
    for edge in patch.add_edges:
        if edge.source not in G.nodes:
            errors.append(ValidationError(
                field="add_edges",
                message=f"Source node '{edge.source}' does not exist",
            ))
            continue
        if edge.target not in G.nodes:
            errors.append(ValidationError(
                field="add_edges",
                message=f"Target node '{edge.target}' does not exist",
            ))
            continue
        if edge.weight < 0 or edge.weight > 1:
            errors.append(ValidationError(
                field="add_edges",
                message=f"Edge weight must be in [0, 1], got {edge.weight}",
            ))
            continue
        G.add_edge(edge.source, edge.target, weight=edge.weight)

    # Remove edges
    for edge in patch.remove_edges:
        if G.has_edge(edge.source, edge.target):
            G.remove_edge(edge.source, edge.target)
        else:
            errors.append(ValidationError(
                field="remove_edges",
                message=f"Edge ({edge.source} -> {edge.target}) does not exist",
            ))

    if errors:
        return graph_json, False, None, errors

    # Check DAG after patch
    is_dag = nx.is_directed_acyclic_graph(G)
    cycle_path = None
    if not is_dag:
        cycle_path = _find_cycle(G)
        errors.append(ValidationError(
            message=f"Patch would create a cycle: {' -> '.join(cycle_path)}",
        ))
        return graph_json, False, cycle_path, errors

    return graph_to_json(G), True, None, []
