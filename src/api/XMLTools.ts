/**
 * Formats an XML string to be pretty and human-readable.
 *
 * @param xml - The XML string to format.
 * @param indentation - The number of spaces for indentation (default is 2).
 * @returns A formatted XML string.
 */
export function formatXML(xml: string, indentation = 2): string {
  if (!xml || typeof xml !== 'string') throw new Error('Input must be a non-empty XML string.');

  const lines = xml.replace(/(>)(<)(\/*)/g, '$1\n$2$3').split('\n');

  const closingTagRegex = /^<\/[^>]+>$/;
  const selfClosingTagRegex = /^<[^>]+\/>$/;
  const openingTagRegex = /^<[^/?!][^>]*>$/;

  let indent = 0;
  return lines
    .map((line) => {
      line = line.trim();
      if (!line) return '';

      const isClosingTag = closingTagRegex.test(line);
      const isSelfClosingTag = selfClosingTagRegex.test(line);
      const isOpeningTag = openingTagRegex.test(line);

      if (isClosingTag) indent -= indentation;

      const formattedLine = ' '.repeat(indent) + line;

      if (isOpeningTag && !isSelfClosingTag) indent += indentation;

      return formattedLine;
    })
    .join('\n');
}
