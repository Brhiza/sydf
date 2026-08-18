(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var version = params.get('v') || '';
  var attempt = Number(params.get('attempt')) || 1;
  var target = new URL('https://sydf.cc/');

  if (!/^[A-Za-z0-9._-]{1,128}$/.test(version)) version = String(Date.now());
  attempt = Math.max(1, Math.min(2, attempt));
  target.searchParams.set('__recovered', version);
  target.searchParams.set('__recoveryAttempt', String(attempt));

  window.setTimeout(function () {
    location.replace(target.toString());
  }, 250);
})();
