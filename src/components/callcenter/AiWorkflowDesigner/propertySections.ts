export const propertySections = [
  { name: 'basic', label: '基础' },
  { name: 'answers', label: '理解' },
  { name: 'routing', label: '出口' },
  { name: 'voice', label: '通话' },
  { name: 'rules', label: '规则' }
];
export const propertySection = (key: string) => {
  if (key.startsWith('accepted') || key.startsWith('declined')) return 'answers';
  if (key === 'conversationRuleMode') return 'rules';
  if (
    key === 'requiredDisclosure' ||
    key.startsWith('disclosure') ||
    key.startsWith('nodeBarge') ||
    key.startsWith('nodeControl') ||
    key.startsWith('playbackFailure')
  )
    return 'voice';
  if (
    [
      'aiUnderstandingEnabled',
      'aiAutoAdvance',
      'answerMode',
      'acceptedAnswers',
      'declinedAnswers',
      'retryText',
      'maxRetries',
      'collectedFields',
      'reuseCollectedFields',
      'intentCodes',
      'fallbackMode',
      'fallbackText',
      'fallbackPrompt',
      'retryLimitAction',
      'limitText',
      'limitQueueCode',
      'limitExtension'
    ].includes(key)
  )
    return 'answers';
  return 'basic';
};
