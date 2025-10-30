// Utility: convert camelCase / PascalCase / snake_case / kebab-case to Title Case
export function camelToTitle(input: string): string {
    if (!input) return '';

    // Normalize separators -> single space
    let s = input.replace(/[_-]+/g, ' ');

    // Insert space between lowerCase/number and UpperCase (e.g. "camelCase" -> "camel Case")
    s = s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');

    // Separate sequences like "HTMLParser" -> "HTML Parser"
    s = s.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

    // Trim and collapse spaces
    const parts = s.trim().split(/\s+/);

    // Title-case each part (keeps acronyms like "ID" turned to "Id" — acceptable for most cases)
    return parts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

export default camelToTitle;