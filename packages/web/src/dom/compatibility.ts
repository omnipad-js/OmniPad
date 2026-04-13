let _isContainerQueriesSupported: boolean | undefined;

export const supportsContainerQueries = (): boolean => {
  if (_isContainerQueriesSupported !== undefined) return _isContainerQueriesSupported;

  _isContainerQueriesSupported =
    typeof window !== 'undefined' && !!window.CSS?.supports?.('width: 1cqw');

  return _isContainerQueriesSupported;
};
