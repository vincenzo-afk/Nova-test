# Symlink Loops — Edge Case

## Scenario

Filesystem traversal (Observer, Indexer, file tools in
`docs/06-tools/`) encounters a symbolic link cycle. Traversal must detect
the cycle via a visited-inode set and terminate that branch rather than
recursing until a stack overflow or resource exhaustion, and the skipped
path is logged, not silently dropped.

## Requirement

Every edge case in this directory must have an explicit test in
`12-testing/` — an edge case with no test is an edge case that will
regress silently.
