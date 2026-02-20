import { FieldDefinition } from '../interfaces.js';

export class FieldNamingValidator {
  
  private readonly FORBIDDEN_FIELD_NAMES = [
    'title',
    'description',
    'id',
    'type',
    'class',
    'style',
    'data',
    'aria',
    'role'
  ];

  private readonly FORBIDDEN_PARTIAL_NAMES = [
    'title', // Completely forbidden in any form
  ];

  private readonly RESERVED_SUFFIXES = [
    'Alt', // Can only be used if base field exists (e.g., imageAlt requires image field)
  ];

  /**
   * Validate field names according to EDS and Universal Editor requirements
   */
  validateFieldNames(fields: FieldDefinition[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const fieldNames = fields.map(f => f.name);

    fields.forEach(field => {
      // Check forbidden names
      if (this.FORBIDDEN_FIELD_NAMES.includes(field.name.toLowerCase())) {
        errors.push(
          `Field name "${field.name}" is forbidden. Use an alternative like "${this.suggestAlternative(field.name)}".`
        );
      }

      // Check forbidden partial names
      this.FORBIDDEN_PARTIAL_NAMES.forEach(partial => {
        if (field.name.toLowerCase().includes(partial)) {
          errors.push(
            `Field name "${field.name}" contains forbidden term "${partial}". ` +
            `Use an alternative like "${this.suggestAlternative(field.name)}".`
          );
        }
      });

      // Check reserved suffixes
      this.RESERVED_SUFFIXES.forEach(suffix => {
        if (field.name.endsWith(suffix)) {
          const baseName = field.name.replace(suffix, '').toLowerCase();
          const hasBaseField = fieldNames.some(name => name.toLowerCase() === baseName);
          
          if (!hasBaseField) {
            errors.push(
              `Field "${field.name}" uses reserved suffix "${suffix}" but base field "${baseName}" doesn't exist.`
            );
          }
        }
      });

      // Check camelCase convention
      if (!this.isCamelCase(field.name)) {
        errors.push(`Field name "${field.name}" should use camelCase convention.`);
      }

      // Check for reasonable length
      if (field.name.length > 50) {
        errors.push(
          `Field name "${field.name}" is too long (${field.name.length} characters). Keep under 50 characters.`
        );
      }

      // Check for reserved JavaScript keywords
      if (this.isReservedKeyword(field.name)) {
        errors.push(`Field name "${field.name}" is a reserved JavaScript keyword. Use an alternative.`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate safe field names from labels or suggested names
   */
  generateSafeFieldName(label: string, existingNames: string[] = []): string {
    // Start with label, clean it up
    let fieldName = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ')        // Normalize spaces
      .trim();

    // Convert to camelCase
    fieldName = fieldName
      .split(' ')
      .map((word, index) => {
        if (index === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');

    // Handle forbidden names
    if (this.isForbiddenName(fieldName)) {
      fieldName = this.suggestAlternative(fieldName);
    }

    // Handle duplicates
    let uniqueName = fieldName;
    let counter = 1;
    while (existingNames.includes(uniqueName)) {
      uniqueName = `${fieldName}${counter}`;
      counter++;
    }

    return uniqueName;
  }

  private isForbiddenName(name: string): boolean {
    const lowerName = name.toLowerCase();
    
    // Check exact forbidden names
    if (this.FORBIDDEN_FIELD_NAMES.includes(lowerName)) {
      return true;
    }

    // Check forbidden partials
    return this.FORBIDDEN_PARTIAL_NAMES.some(partial => lowerName.includes(partial));
  }

  private suggestAlternative(fieldName: string): string {
    const alternatives: { [key: string]: string } = {
      'title': 'heading',
      'description': 'body',
      'id': 'identifier',
      'type': 'category',
      'class': 'styleClass',
      'style': 'styling',
      'data': 'content',
      'aria': 'accessibility',
      'role': 'userRole'
    };

    const lowerName = fieldName.toLowerCase();
    
    // Check for direct matches
    for (const [forbidden, alternative] of Object.entries(alternatives)) {
      if (lowerName === forbidden) {
        return alternative;
      }
      if (lowerName.includes(forbidden)) {
        return fieldName.replace(new RegExp(forbidden, 'gi'), alternative);
      }
    }

    // Fallback: add prefix
    return `content${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
  }

  private isCamelCase(name: string): boolean {
    // Should start with lowercase letter and use camelCase
    return /^[a-z][a-zA-Z0-9]*$/.test(name);
  }

  private isReservedKeyword(name: string): boolean {
    const keywords = [
      'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
      'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
      'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
      'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof',
      'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'enum',
      'implements', 'interface', 'package', 'private', 'protected',
      'public', 'abstract', 'boolean', 'byte', 'char', 'double', 'final',
      'float', 'goto', 'int', 'long', 'native', 'short', 'synchronized',
      'throws', 'transient', 'volatile'
    ];

    return keywords.includes(name.toLowerCase());
  }
}