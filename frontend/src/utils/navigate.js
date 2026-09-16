let _navigate = null;

export const setNavigate = (nav) => { _navigate = nav; };

export const navigateTo = (path) => {
  if (_navigate) _navigate(path, { replace: true });
  else window.location.href = path;
};
