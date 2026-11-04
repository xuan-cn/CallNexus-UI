/** Normalize display-only error text, never identifiers, configuration values or response payloads. */
export function userFacingMessage(message: string): string {
  return message
    .replace(/freeswitch/gi, '话务服务')
    .replace(/([\u4e00-\u9fff]) +话务服务/g, '$1话务服务')
    .replace(/话务服务 +(?=[\u4e00-\u9fff])/g, '话务服务');
}
