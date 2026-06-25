import { prisma } from '../prisma';

export function compileTemplate(
  templateContent: string,
  variables: Record<string, string | number>
): string {
  let content = templateContent;
  
  // Replace all {{variable}} occurrences
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, String(value));
  }
  
  return content;
}
