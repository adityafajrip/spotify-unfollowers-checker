(function () {
  const orig = window.fetch;
  window.fetch = async function (...args) {
    const res = await orig.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');

    const isProfileEndpoint =
      /user-profile-view\/v\d+\/profile\/[^/?]+/.test(url) ||
      /api\.spotify\.com\/v1\/users\/[^/?]+/.test(url);

    if (isProfileEndpoint) {
      try {
        res.clone().json().then(data => {
          // spclient uses image_url; public API uses images[]
          const imgUrl = data?.image_url || data?.images?.[0]?.url || '';
          const userId = data?.id || data?.uri?.replace('spotify:user:', '') || '';
          const displayName = data?.name || data?.display_name || '';
          if (userId) {
            window.postMessage({ type: '__SU_PROFILE__', imgUrl, userId, displayName }, 'https://open.spotify.com');
          }
        }).catch(() => {});
      } catch (_) {}
    }

    return res;
  };
})();
