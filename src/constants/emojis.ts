export const EMOJIS = {
  status: {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
    pending: '🕐',
    inProgress: '🔄',
    new: '🆕',
    active: '🟢',
    inactive: '⚪',
  },

  navigation: {
    dashboard: '📊',
    analytics: '📈',
    events: '🎉',
    ambassadors: '🌟',
    mentions: '#️⃣',
    storyMentions: '💬',
    settings: '⚙️',
    notifications: '🔔',
    profile: '👤',
    organizations: '🏢',
    import: '📥',
    export: '📤',
  },

  actions: {
    edit: '✏️',
    delete: '🗑️',
    save: '💾',
    refresh: '🔄',
    sync: '🔄',
    add: '➕',
    remove: '➖',
    search: '🔍',
    filter: '🔽',
    copy: '📋',
    download: '⬇️',
    upload: '⬆️',
    play: '▶️',
    pause: '⏸️',
    stop: '⏹️',
    link: '🔗',
    unlink: '🔓',
    lock: '🔒',
    unlock: '🔓',
    view: '👁️',
    hide: '🙈',
    expand: '📂',
    collapse: '📁',
  },

  entities: {
    organization: '🏢',
    user: '👤',
    users: '👥',
    ambassador: '🌟',
    event: '🎉',
    fiesta: '🎊',
    task: '📋',
    story: '📸',
    mention: '💬',
    message: '💬',
    comment: '💭',
    notification: '🔔',
    database: '🗄️',
    webhook: '🌐',
    token: '🔑',
    calendar: '📅',
    clock: '🕐',
    timer: '⏱️',
  },

  feedback: {
    celebrate: '🎊',
    sparkles: '✨',
    thumbsUp: '👍',
    thumbsDown: '👎',
    heart: '❤️',
    star: '⭐',
    fire: '🔥',
    rocket: '🚀',
    trophy: '🏆',
    medal: '🏅',
    crown: '👑',
    lightning: '⚡',
    bulb: '💡',
    target: '🎯',
  },

  social: {
    instagram: 'instagram-image',
    followers: '👥',
    likes: '❤️',
    comments: '💬',
    shares: '🔁',
    reach: '📢',
    impressions: '👀',
  },

  ui: {
    loading: '⏳',
    empty: '📭',
    notFound: '🔍',
    forbidden: '🚫',
    maintenance: '🔧',
    help: '❓',
    tip: '💡',
    privacy: '🛡️',
    security: '🔒',
    verified: '✓',
    globe: '🌐',
    chart: '📊',
    money: '💰',
    email: '📧',
    phone: '📱',
  },

  priority: {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  },

  weather: {
    sun: '☀️',
    moon: '🌙',
    cloud: '☁️',
  },

  letters: {
    A: '🅰',
    B: '🅱',
    C: '🅲',
    D: '🅳',
    E: '🅴',
    F: '🅵',
    G: '🅶',
    H: '🅷',
    I: '🅸',
    J: '🅹',
    K: '🅺',
    L: '🅻',
    M: '🅼',
    N: '🅽',
    O: '🅾',
    P: '🅿',
    Q: '🆀',
    R: '🆁',
    S: '🆂',
    T: '🆃',
    U: '🆄',
    V: '🆅',
    W: '🆆',
    X: '🆇',
    Y: '🆈',
    Z: '🆉',
  },
} as const;

export type EmojiCategory = keyof typeof EMOJIS;
export type StatusEmoji = keyof typeof EMOJIS.status;
export type NavigationEmoji = keyof typeof EMOJIS.navigation;
export type ActionEmoji = keyof typeof EMOJIS.actions;
export type EntityEmoji = keyof typeof EMOJIS.entities;
export type FeedbackEmoji = keyof typeof EMOJIS.feedback;
export type SocialEmoji = keyof typeof EMOJIS.social;
export type UIEmoji = keyof typeof EMOJIS.ui;
export type PriorityEmoji = keyof typeof EMOJIS.priority;

export function getStatusEmoji(
  status: 'success' | 'warning' | 'error' | 'info' | 'pending' | 'inProgress'
): string {
  return EMOJIS.status[status];
}

export function getNavigationEmoji(item: NavigationEmoji): string {
  return EMOJIS.navigation[item];
}

export function getEntityEmoji(entity: EntityEmoji): string {
  return EMOJIS.entities[entity];
}

export function getActionEmoji(action: ActionEmoji): string {
  return EMOJIS.actions[action];
}

export function getFeedbackEmoji(feedback: FeedbackEmoji): string {
  return EMOJIS.feedback[feedback];
}

export type LetterEmoji = keyof typeof EMOJIS.letters;

export function getLetterEmoji(letter: string): string {
  const upperLetter = letter.toUpperCase() as LetterEmoji;
  return EMOJIS.letters[upperLetter] || letter;
}

export function getInitialsAsEmoji(name: string): string {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return initials
    .split('')
    .map((letter) => getLetterEmoji(letter))
    .join('');
}
