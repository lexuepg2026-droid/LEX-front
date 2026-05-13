export const getToken = () => localStorage.getItem('lex-token');
export const setToken = (t) => localStorage.setItem('lex-token', t);
export const removeToken = () => localStorage.removeItem('lex-token');

export const getTheme = () => localStorage.getItem('lex-theme') || 'dark';
export const setTheme = (t) => localStorage.setItem('lex-theme', t);
export const removeTheme = () => localStorage.removeItem('lex-theme');
