import { BlockAnalysis } from '../types.js';
import { UniversalEditorModel } from '../interfaces.js';

export class ModelGenerator {

  /**
   * Generate Universal Editor model JSON for a block
   */
  async generate(analysis: BlockAnalysis): Promise<string> {
    const model = this.createModel(analysis);
    return JSON.stringify(model, null, 2);
  }

  private createModel(analysis: BlockAnalysis): UniversalEditorModel {
    if (analysis.blockType === 'multi-item') {
      return this.createMultiItemModel(analysis);
    } else {
      return this.createSingleItemModel(analysis);
    }
  }

  private createMultiItemModel(analysis: BlockAnalysis): UniversalEditorModel {
    const blockId = analysis.blockName;
    const itemId = `${blockId}-item`;
    
    console.log('[DEBUG] ModelGenerator.createMultiItemModel called for:', blockId);
    console.log('[DEBUG] Container fields received:', JSON.stringify(analysis.contentStructure.containerFields, null, 2));
    console.log('[DEBUG] Item fields received:', JSON.stringify(analysis.contentStructure.itemFields, null, 2));
    
    const definitions = [
      // Container definition
      {
        title: this.capitalize(analysis.blockName.replace(/-/g, ' ')),
        id: blockId,
        plugins: {
          xwalk: {
            page: {
              resourceType: 'core/franklin/components/block/v1/block',
              template: {
                name: this.capitalize(analysis.blockName.replace(/-/g, ' ')),
                model: blockId,
                filter: blockId
              } as import('../interfaces.js').ParentBlockTemplate
            }
          }
        }
      }
    ];

    const models = [];
    const filters = [];

    // CRITICAL UNIVERSAL EDITOR PATTERN:
    // Container models enable authoring UI for block-level editable content (heading, intro, etc.)
    // The SAME content is then extracted from DOM rows in JavaScript for rendering
    // This dual-use allows:
    //   1. Universal Editor: Authors edit via form fields
    //   2. Published Site: JavaScript extracts from generated DOM rows
    // Container models are RECOMMENDED when blocks have container-level content for better UX
    if (analysis.contentStructure.containerFields.length > 0) {
      models.push({
        id: blockId,
        fields: this.formatModelFields(analysis.contentStructure.containerFields)
      });
    }

    // Add item definition and model
    if (analysis.contentStructure.itemFields && analysis.contentStructure.itemFields.length > 0) {
      console.log('[DEBUG] Creating item model with', analysis.contentStructure.itemFields.length, 'fields');
      
      const formattedItemFields = this.formatModelFields(analysis.contentStructure.itemFields);
      console.log('[DEBUG] Formatted item fields:', JSON.stringify(formattedItemFields, null, 2));
      
      definitions.push({
        title: this.capitalize(analysis.blockName.replace(/-/g, ' ')) + ' Item',
        id: itemId,
        plugins: {
          xwalk: {
            page: {
              resourceType: 'core/franklin/components/block/v1/block/item',
              template: {
                name: this.capitalize(analysis.blockName.replace(/-/g, ' ')) + ' Item',
                model: itemId
              } as import('../interfaces.js').ChildBlockTemplate
            }
          }
        }
      });

      models.push({
        id: itemId,
        fields: formattedItemFields
      });

      // Add filter
      filters.push({
        id: blockId,
        components: [itemId]
      });
    }

    const result: UniversalEditorModel = {
      definitions,
      models,
      filters: filters.length > 0 ? filters : []
    };

    return result;
  }

  private createSingleItemModel(analysis: BlockAnalysis): UniversalEditorModel {
    const blockId = analysis.blockName;
    
    return {
      definitions: [
        {
          title: this.capitalize(analysis.blockName.replace(/-/g, ' ')),
          id: blockId,
          plugins: {
            xwalk: {
              page: {
                resourceType: 'core/franklin/components/block/v1/block',
                template: {
                  name: this.capitalize(analysis.blockName.replace(/-/g, ' ')),
                  model: blockId
                } as import('../interfaces.js').ParentBlockTemplate
              }
            }
          }
        }
      ],
      models: [
        {
          id: blockId,
          fields: this.formatModelFields(analysis.contentStructure.containerFields)
        }
      ],
      filters: []
    };
  }



  /**
   * Format fields to ensure they have the required properties for EDS models
   */
  private formatModelFields(fields: any[]): any[] {
    return fields.map(field => ({
      component: field.component,
      name: field.name,
      label: field.label,
      valueType: field.valueType,
      value: field.value || '',
      ...(field.required !== undefined && { required: field.required }),
      ...(field.maxLength && { maxLength: field.maxLength }),
      ...(field.description && { description: field.description }),
      // Add multi property only for reference components and if explicitly set
      ...(field.component === 'reference' && { multi: false }),
    }));
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}