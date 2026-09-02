export interface SessionPayload {
  /** id строки AuthSession — по нему сессию можно отозвать */
  sid: string;
  sub: string;
}

export interface RequestTeacher {
  id: string;
  login: string;
  fullName: string;
  sessionId: string;
}

export const SESSION_COOKIE = 'edway_session';
