export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface Dataroom {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  file_count: number;
  files?: File[];
}

export interface File {
  id: string;
  dataroom_id: string;
  google_file_id: string | null;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  original_url: string | null;
  status: 'imported' | 'deleted' | 'failed';
  imported_at: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mime_type: string | null;
  size: string | null;
  modified_time: string | null;
  web_view_link: string | null;
  icon_link: string | null;
}

export interface ApiError {
  error: string;
  message: string;
}

