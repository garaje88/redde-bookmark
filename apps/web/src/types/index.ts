export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  faviconUrl?: string;
  screenshotUrl?: string;
  screenshotPath?: string;
  tags?: string[];
  collectionId?: string;
  pinned?: boolean;
  lang?: string;
  owner: string;
  createdAt: any;
  updatedAt: any;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;  // ID de la colección padre (si es subcolección)
  owner: string;
  createdAt: any;
  updatedAt: any;
}
