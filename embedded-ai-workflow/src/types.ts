export type TargetPlatform = 'stm32-hal' | 'esp-idf';

export interface GeneratedFile {
	path: string;
	content: string;
}

export interface GeneratedManifest {
	files: GeneratedFile[];
}

