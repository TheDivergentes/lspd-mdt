export interface HotkeyRegisterResult {
  key: string;
  target: string;
  ok: boolean;
  error?: string;
}

export interface UpdateStatus {
  state: "available" | "latest" | "downloading" | "ready" | "error";
  version?: string;
  percent?: number;
  message?: string;
}

export interface Officer {
  id: string;
  nickname: string;
  username: string;
  avatarUrl: string;
  factionId: string;
  factionName: string;
  themeColor: string;
  rank: string;
  rankLevel: number;
  badge: string;
  department: string | null;
  position: string | null;
  academyStage: string | null;
  casePrefix: string;
  canManage: boolean;
  defaultPanels: string[];
  isAppAdmin: boolean;
}

// Discord-конфиг больше не хранится на клиенте вообще — токены, каналы,
// маппинг ролей переехали на backend. Клиенту нужен только его адрес.
export interface BackendSettings {
  backendUrl: string;
}

export interface Faction {
  id: string;
  name: string;
  guildId: string;
  themeColor: string | null;
  manageThreshold: number;
  boloCreateThreshold: number;
  casePrefix: string;
  casesChannelId: string | null;
  citizensChannelId: string | null;
  boloChannelId: string | null;
  vehiclesChannelId: string | null;
  warrantsChannelId: string | null;
  evidenceChannelId: string | null;
  accidentsChannelId: string | null;
  codexChannelId: string | null;
  logChannelId: string | null;
  statusChannelId: string | null;
  allowedRoleIds: string; // JSON-строка на backend'е — парсить на клиенте
  adminRoleIds: string;
}

export interface RankMappingRow {
  id: string;
  factionId: string;
  discordRoleId: string;
  rankName: string;
  rankLevel: number;
  badgePrefix: string;
  defaultPanels: string; // JSON-строка
}

export interface DepartmentMappingRow {
  id: string;
  factionId: string;
  discordRoleId: string;
  departmentName: string;
}

export interface PositionMappingRow {
  id: string;
  factionId: string;
  discordRoleId: string;
  positionName: string;
}

export interface AcademyMappingRow {
  id: string;
  factionId: string;
  discordRoleId: string;
  stageName: string;
}

export interface VoiceMember {
  id: string;
  nickname: string;
  avatarUrl: string;
  muted: boolean;
  deafened: boolean;
}

export interface VoiceChannel {
  id: string;
  name: string;
  position: number;
  userLimit: number;
  members: VoiceMember[];
}

export interface OfficerListEntry {
  id: string;
  nickname: string;
  avatarUrl: string;
  rank: string;
  rankLevel: number;
  badge: string;
  department: string | null;
  position: string | null;
  status: { code: string; label: string; at: number } | null;
  stats: { created: number; closed: number };
}

export interface LogMessage {
  id: string;
  content: string;
  author: string;
  createdAt: number;
}

export interface Attachment {
  name: string;
  url: string;
  contentType?: string;
}

export interface ForumEntry {
  threadId: string;
  title: string;
  archived: boolean;
  createdAt: string;
  url: string;
  fields: Record<string, string>;
  attachments?: Attachment[];
}

export interface CodexArticle {
  id: string;
  title: string;
  category: string;
  penaltyMonths: number;
  penaltyFine: number;
  confiscation: boolean;
  description: string;
  keySigns: string[];
  related: string[];
}

export interface BinderItem {
  action: string;
  key: string;
}

// window.electronAPI задаётся в electron/preload.js
declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>;
      close: () => Promise<void>;
      toggleAlwaysOnTop: () => Promise<boolean>;
      showAuthWindow: () => Promise<void>;
      quitApp: () => Promise<boolean>;
      openExternal: (url: string) => Promise<boolean>;
      listRecentLogs: () => Promise<{ ok: boolean; messages: LogMessage[]; guildId?: string; logChannelId?: string; error?: string }>;
      applyRoleDefaults: () => Promise<{ ok: boolean; panels?: string[]; error?: string }>;

      openPanel: (name: string) => Promise<boolean>;
      hidePanel: (name: string) => Promise<boolean>;
      resetLayout: () => Promise<boolean>;

      getHotkeys: () => Promise<Record<string, string>>;
      saveHotkeys: (bindings: Record<string, string>) => Promise<{ ok: boolean; results: HotkeyRegisterResult[] }>;
      resetHotkeys: () => Promise<{ bindings: Record<string, string>; results: HotkeyRegisterResult[] }>;

      getOpacitySettings: () => Promise<{ opacity: number; autoFade: boolean; fadeOpacity: number }>;
      saveOpacitySettings: (settings: { opacity: number; autoFade: boolean; fadeOpacity: number }) => Promise<boolean>;

      getInteractiveMode: () => Promise<boolean>;
      toggleInteractiveMode: () => Promise<boolean>;
      onInteractiveModeChanged: (cb: (value: boolean) => void) => void;

      checkForUpdate: () => Promise<{ ok: boolean; version?: string; error?: string }>;
      downloadUpdate: () => Promise<{ ok: boolean; error?: string }>;
      installUpdate: () => Promise<boolean>;
      onUpdateStatus: (cb: (payload: UpdateStatus) => void) => void;

      listVoiceChannels: () => Promise<{ ok: boolean; channels: VoiceChannel[]; canMove: boolean; selfId: string | null; error?: string }>;
      moveMember: (memberId: string, channelId: string) => Promise<{ ok: boolean; error?: string }>;

      isConfigured: () => Promise<boolean>;
      adminLogin: (pin: string) => Promise<{ ok: boolean; mustChangePin: boolean }>;
      changeAdminPin: (oldPin: string, newPin: string) => Promise<{ ok: boolean; error?: string }>;
      getBackendUrl: () => Promise<string>;
      saveBackendUrl: (url: string) => Promise<boolean>;

      hasAdminSecret: () => Promise<boolean>;
      saveAdminSecret: (secret: string) => Promise<boolean>;
      clearAdminSecret: () => Promise<boolean>;

      listFactions: () => Promise<{ ok: boolean; items: Faction[]; error?: string }>;
      createFaction: (payload: Partial<Faction>) => Promise<{ ok: boolean; faction?: Faction; error?: string }>;
      updateFaction: (id: string, payload: Partial<Faction>) => Promise<{ ok: boolean; faction?: Faction; error?: string }>;
      deleteFaction: (id: string) => Promise<{ ok: boolean; error?: string }>;

      listRanks: (factionId: string) => Promise<{ ok: boolean; items: RankMappingRow[]; error?: string }>;
      createRank: (factionId: string, payload: Partial<RankMappingRow>) => Promise<{ ok: boolean; item?: RankMappingRow; error?: string }>;
      updateRank: (id: string, payload: Partial<RankMappingRow>) => Promise<{ ok: boolean; item?: RankMappingRow; error?: string }>;
      deleteRank: (id: string) => Promise<{ ok: boolean; error?: string }>;

      listDepartments: (factionId: string) => Promise<{ ok: boolean; items: DepartmentMappingRow[]; error?: string }>;
      createDepartment: (factionId: string, payload: Partial<DepartmentMappingRow>) => Promise<{ ok: boolean; item?: DepartmentMappingRow; error?: string }>;
      updateDepartment: (id: string, payload: Partial<DepartmentMappingRow>) => Promise<{ ok: boolean; item?: DepartmentMappingRow; error?: string }>;
      deleteDepartment: (id: string) => Promise<{ ok: boolean; error?: string }>;

      listPositions: (factionId: string) => Promise<{ ok: boolean; items: PositionMappingRow[]; error?: string }>;
      createPosition: (factionId: string, payload: Partial<PositionMappingRow>) => Promise<{ ok: boolean; item?: PositionMappingRow; error?: string }>;
      updatePosition: (id: string, payload: Partial<PositionMappingRow>) => Promise<{ ok: boolean; item?: PositionMappingRow; error?: string }>;
      deletePosition: (id: string) => Promise<{ ok: boolean; error?: string }>;

      listAcademy: (factionId: string) => Promise<{ ok: boolean; items: AcademyMappingRow[]; error?: string }>;
      createAcademy: (factionId: string, payload: Partial<AcademyMappingRow>) => Promise<{ ok: boolean; item?: AcademyMappingRow; error?: string }>;
      updateAcademy: (id: string, payload: Partial<AcademyMappingRow>) => Promise<{ ok: boolean; item?: AcademyMappingRow; error?: string }>;
      deleteAcademy: (id: string) => Promise<{ ok: boolean; error?: string }>;

      loginWithDiscord: () => Promise<{ ok: boolean; officer?: Officer; error?: string }>;
      getSession: () => Promise<{ officer: Officer } | null>;
      listProfiles: () => Promise<Officer[]>;
      continueWithProfile: (officerId: string) => Promise<{ ok: boolean; officer?: Officer; error?: string }>;
      forgetProfile: (officerId: string) => Promise<boolean>;
      logout: () => Promise<boolean>;

      listCases: () => Promise<{ ok: boolean; items: ForumEntry[]; error?: string }>;
      createCase: (payload: any) => Promise<{ ok: boolean; error?: string }>;
      updateCaseStatus: (threadId: string, status: string) => Promise<{ ok: boolean; error?: string }>;

      listCitizens: () => Promise<{ ok: boolean; items: ForumEntry[]; error?: string }>;
      createCitizen: (payload: any) => Promise<{ ok: boolean; error?: string }>;
      updateCitizen: (threadId: string, fields: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;

      listBolo: () => Promise<{ ok: boolean; items: ForumEntry[]; error?: string }>;
      createBolo: (payload: any) => Promise<{ ok: boolean; error?: string }>;
      updateBoloStatus: (threadId: string, status: string) => Promise<{ ok: boolean; error?: string }>;

      listCodex: () => Promise<{ ok: boolean; items: ForumEntry[]; error?: string }>;
      createCodexArticle: (payload: any) => Promise<{ ok: boolean; error?: string }>;
      updateCodexArticle: (threadId: string, payload: any) => Promise<{ ok: boolean; error?: string }>;
      deleteCodexArticle: (threadId: string) => Promise<{ ok: boolean; error?: string }>;
      renameCodexCategory: (oldName: string, newName: string) => Promise<{ ok: boolean; updated?: number; error?: string }>;

      updateCase: (threadId: string, fields: Record<string, string>, newTitle?: string) => Promise<{ ok: boolean; error?: string }>;
      attachScreenshots: (threadId: string, note?: string) => Promise<{ ok: boolean; canceled?: boolean; attachments?: Attachment[]; error?: string }>;
      listAttachments: (threadId: string) => Promise<{ ok: boolean; attachments: Attachment[]; error?: string }>;
      setOfficerStatus: (code: string, label: string) => Promise<{ ok: boolean; error?: string }>;
      broadcastMessage: (message: string) => Promise<{ ok: boolean; error?: string }>;
      getOfficerStatus: () => Promise<{ code: string; label: string; at: number } | null>;

      listVehicles: () => Promise<{ ok: boolean; items: ForumEntry[]; error?: string }>;

      listEvidence: () => Promise<{ ok: boolean; items: ForumEntry[]; error?: string }>;
      createEvidence: (payload: any) => Promise<{ ok: boolean; error?: string }>;
      updateEvidence: (threadId: string, fields: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;

      listAccidents: () => Promise<{ ok: boolean; items: ForumEntry[]; error?: string }>;
      createAccident: (payload: any) => Promise<{ ok: boolean; error?: string }>;
      updateAccident: (threadId: string, fields: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;
      updateAccidentStatus: (threadId: string, status: string) => Promise<{ ok: boolean; error?: string }>;
      createVehicle: (payload: any) => Promise<{ ok: boolean; error?: string }>;
      updateVehicle: (threadId: string, fields: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;

      listWarrants: () => Promise<{ ok: boolean; items: ForumEntry[]; error?: string }>;
      createWarrant: (payload: any) => Promise<{ ok: boolean; error?: string }>;
      updateWarrantStatus: (threadId: string, status: string) => Promise<{ ok: boolean; error?: string }>;
      listOfficers: () => Promise<{ ok: boolean; items: OfficerListEntry[]; error?: string }>;
      searchCodex: (query: string) => Promise<CodexArticle[]>;

      getBinder: () => Promise<BinderItem[]>;
      saveBinder: (binder: BinderItem[]) => Promise<boolean>;

      onDiscordLog: (cb: (entry: any) => void) => void;
    };
  }
}

export const api = () => window.electronAPI;
