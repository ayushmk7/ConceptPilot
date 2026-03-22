/**
 * Classify student workspace CSV uploads (scores vs question→concept mapping).
 */

export type CsvRole = 'scores' | 'mapping';

/** Peek at header row to distinguish scores vs mapping when filenames are generic. */
export async function sniffCsvRoleFromHeader(file: File): Promise<CsvRole | null> {
  try {
    const head = await file.slice(0, 16384).text();
    const line = head.split(/\r?\n/).find((l) => l.trim()) ?? '';
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const lower = cols.map((c) => c.toLowerCase());
    const set = new Set(lower);
    const hasStudent = set.has('studentid');
    const hasConcept = set.has('conceptid');
    const hasQ = set.has('questionid');
    if (hasStudent && hasQ) return 'scores';
    if (hasConcept && hasQ && !hasStudent) return 'mapping';
    if (hasStudent) return 'scores';
    if (hasConcept) return 'mapping';
  } catch {
    /* ignore */
  }
  return null;
}

function roleFromFilename(name: string): CsvRole | null {
  const n = name.toLowerCase();
  if (n.includes('map')) return 'mapping';
  if (n.includes('score')) return 'scores';
  return null;
}

/** Best-effort role for one file (filename first, then header sniff). */
export async function classifyStudentCsv(file: File): Promise<CsvRole | null> {
  const fromName = roleFromFilename(file.name);
  if (fromName) return fromName;
  return sniffCsvRoleFromHeader(file);
}

/**
 * Given one or two CSV files (e.g. from a multi-select dialog), assign scores vs mapping.
 * When both are ambiguous, first file → scores, second → mapping.
 */
export async function resolveScoresAndMappingFiles(files: File[]): Promise<{
  scores: File | null;
  mapping: File | null;
}> {
  const slice = files.slice(0, 2);
  if (slice.length === 0) return { scores: null, mapping: null };

  if (slice.length === 1) {
    const r = await classifyStudentCsv(slice[0]);
    if (r === 'scores') return { scores: slice[0], mapping: null };
    if (r === 'mapping') return { scores: null, mapping: slice[0] };
    return { scores: null, mapping: null };
  }

  const [a, b] = slice;
  const [ra, rb] = await Promise.all([classifyStudentCsv(a), classifyStudentCsv(b)]);

  if (ra === 'scores' && rb === 'mapping') return { scores: a, mapping: b };
  if (ra === 'mapping' && rb === 'scores') return { scores: b, mapping: a };

  if (ra === 'scores' && rb === 'scores') return { scores: a, mapping: b };
  if (ra === 'mapping' && rb === 'mapping') return { scores: a, mapping: b };

  if (ra === 'scores') return { scores: a, mapping: b };
  if (rb === 'scores') return { scores: b, mapping: a };
  if (ra === 'mapping') return { scores: b, mapping: a };
  if (rb === 'mapping') return { scores: a, mapping: b };

  return { scores: a, mapping: b };
}
