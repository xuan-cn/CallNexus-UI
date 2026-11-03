import { describe, expect, it } from 'vitest';
import { propertySection, propertySections } from './propertySections';
import { aiWorkflowNodeDefinitions } from './nodeRegistry';
describe('node property sections', () => {
  it('keeps every declared property in a known section', () => {
    const sections = propertySections.map((section) => section.name);
    for (const node of aiWorkflowNodeDefinitions) for (const property of node.properties) expect(sections).toContain(propertySection(property.key));
  });
  it('separates understanding, voice policy, and common rules', () => {
    expect(propertySection('text')).toBe('basic');
    expect(propertySection('answerMode')).toBe('answers');
    expect(propertySection('disclosureBargeInMode')).toBe('voice');
    expect(propertySection('nodeControlText')).toBe('voice');
    expect(propertySection('conversationRuleMode')).toBe('rules');
    expect(propertySection('futureProperty')).toBe('basic');
  });
});
