/**
 * Shared interfaces for the Figma EDS MCP Server
 */

export interface FieldOption {
  name: string;
  value: string;
}

export interface FieldDefinition {
  component: string;
  valueType: string;
  name: string;
  label?: string;
  // Allow other optional properties commonly found in field definitions
  type?: string;
  required?: boolean;
  description?: string;
  maxLength?: number;
  options?: FieldOption[];
}

export interface SectionModelField {
  name: string;
  component: string;
  constraints?: {
    allowedComponents?: string[];
  };
  [key: string]: unknown; // Allow other properties
}

export interface SectionModel {
  fields?: SectionModelField[];
  filters?: {
    id: string;
    components: string[];
  }[];
  [key: string]: unknown; // Allow other properties
}

export interface ParentBlockTemplate {
  name: string;
  model?: string;
  filter?: string;
}

export interface ChildBlockTemplate {
  name: string;
  model: string;
  // Child templates should NOT have filter property
}

export interface ModelDefinition {
  title: string;
  id: string;
  plugins: {
    xwalk: {
      page: {
        resourceType: string;
        template: ParentBlockTemplate | ChildBlockTemplate;
      };
    };
  };
}

export interface ModelField {
  id: string;
  fields: FieldDefinition[];
}

export interface ModelFilter {
  id: string;
  components: string[];
}

export interface UniversalEditorModel {
  definitions: ModelDefinition[];
  models: ModelField[];
  filters: ModelFilter[];
}

// Figma-related interfaces
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  fills?: Array<{
    type: string;
    color?: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
  }>;
  strokes?: Array<{
    type: string;
    color?: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
  }>;
  effects?: Array<{
    type: string;
    visible: boolean;
    radius?: number;
    color?: {
      r: number;
      g: number;
      b: number;
      a: number;
    };
  }>;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  constraints?: {
    vertical: string;
    horizontal: string;
  };
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  [key: string]: unknown; // Allow additional Figma properties
}

export interface FigmaDesignData {
  document?: {
    id: string;
    name: string;
    type: string;
    children: FigmaNode[];
  };
  components?: Record<string, FigmaNode>;
  schemaVersion?: number;
  styles?: Record<string, {
    key: string;
    name: string;
    styleType: string;
  }>;
  name?: string;
  lastModified?: string;
  thumbnailUrl?: string;
  version?: string;
  role?: string;
  editorType?: string;
  linkAccess?: string;
  [key: string]: unknown; // Allow additional properties from Figma API
}

export interface FigmaCodeData {
  css?: string;
  html?: string;
  javascript?: string;
  metadata?: {
    width?: number;
    height?: number;
    backgroundColor?: string;
    fonts?: string[];
  };
  [key: string]: unknown; // Allow additional code generation properties
}

// Common interface for Figma clients - using proper types
export interface FigmaClientInterface {
  getNode(fileKey: string, nodeId: string, accessToken?: string): Promise<unknown>;
  getFile(fileKey: string, accessToken?: string): Promise<FigmaFileResponse>;
  getScreenshot?(figmaUrl: string): Promise<string>;
  getGeneratedCode?(figmaUrl: string): Promise<FigmaCodeData>;
}

// Server method parameter interfaces
export interface AnalyzeBlockStructureArgs {
  // Figma provenance removed; analysis relies solely on provided generatedCode
  generatedCode: string; // Required: Pre-generated code from get_design_context (React + Tailwind)
  screenshot?: string; // Optional screenshot data
  metadata?: string; // Optional metadata JSON
}

export interface ValidateBlockOutputArgs {
  blockPath: string;
  blockName: string;
  strictMode?: boolean;
}

export interface UpdateSectionModelArgs {
  blockName: string;
  sectionModelPath: string;
  blockType: 'single' | 'multi-item';
}

// Figma-specific data structures for analyzer
export interface FigmaFill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE' | 'EMOJI';
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  imageRef?: string;
  [key: string]: unknown; // Allow additional Figma properties
}

export interface DesignToken {
  figmaToken: string;
  cssVariable: string;
  value: string;
  context: 'text' | 'background' | 'border' | 'button';
}

export interface TypographyToken {
  figmaToken: string;
  cssVariable: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  fontFamily: string;
}

export interface SpacingToken {
  figmaToken: string;
  cssVariable: string;
  value: string;
  usage: 'padding' | 'margin' | 'gap';
}

export interface CTAButton {
  text: string;
  type: 'primary' | 'secondary';
  url: string;
}

export interface InteractionLink {
  text: string;
  url: string;
  type: 'internal' | 'external';
}

export interface HoverState {
  element: string;
  state: string;
}

export interface BlockField {
  name: string;
  label: string;
  component: string;
  valueType: string;
  required: boolean;
  maxLength?: number;
  description?: string;
}

// Figma file response interface
export interface FigmaFileResponse {
  document: {
    id: string;
    name: string;
    type: string;
    children: FigmaNode[];
  };
  components?: Record<string, FigmaNode>;
  componentSets?: Record<string, {
    key: string;
    name: string;
    description?: string;
  }>;
  schemaVersion: number;
  styles?: Record<string, {
    key: string;
    name: string;
    description?: string;
    styleType: string;
  }>;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  role: string;
  editorType: string;
  linkAccess: string;
  [key: string]: unknown; // Allow additional properties from Figma API
}

// Figma variables response interface
export interface FigmaVariablesResponse {
  meta: {
    variableCollections: Record<string, {
      id: string;
      name: string;
      key: string;
      modes: Array<{
        modeId: string;
        name: string;
      }>;
      defaultModeId: string;
      remote: boolean;
      hiddenFromPublishing: boolean;
    }>;
    variables: Record<string, {
      id: string;
      name: string;
      key: string;
      variableCollectionId: string;
      resolvedType: string;
      description?: string;
      hiddenFromPublishing: boolean;
      scopes: string[];
      codeSyntax?: Record<string, string>;
    }>;
  };
  [key: string]: unknown; // Allow additional properties
}
