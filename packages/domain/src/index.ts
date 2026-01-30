export type Stage = 'input' | 'topic' | 'outline' | 'draft' | 'ready' | 'published';

export interface Artifact {
  id: string;
  stage: Stage;
  title: string;
  seedType?: 'tennis' | 'weights' | 'cases' | 'custom';
  createdAt: string;
  updatedAt: string;
}
