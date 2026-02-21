(function() {
  function escapeHtml(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
  function formatPrice(n) {
    if (n == null) return '';
    return '₹ ' + Number(n).toLocaleString('en-IN');
  }
  function renderCard(p) {
    var compare = p.compare_at_price_inr;
    var price = p.price_inr;
    var off = '';
    if (compare && compare > price && price > 0) {
      off = Math.round((1 - price / compare) * 100) + '% off';
    }
    var img = p.image || '/cdn/shop/files/placeholder.jpg';
    var url = '/collections/all-products/products/' + p.handle + '.html';
    return '<li class="grid__item">' +
      '<div class="card-wrapper" data-product-id="' + (p.id || '') + '">' +
      '<use-animate data-animate="zoom-fade-small" class="card card--product" tabindex="-1">' +
      '<a href="' + url + '" class="card__media media-wrapper" tabindex="-1">' +
      '<div class="card--image-animate image-animate media media--adapt media--hover-effect" style="--image-ratio-percent: 127%;">' +
      '<picture class="motion-reduce">' +
      '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(p.title) + '" width="1100" height="1400" loading="lazy" class="motion-reduce" sizes="(min-width: 1600px) 367px, (min-width: 990px) calc((100vw - 10rem) / 4), (min-width: 750px) calc((100vw - 10rem) / 3), calc(62vw - 3rem)" is="lazy-image">' +
      '</picture></div></a>' +
      '<div class="card-information">' +
      '<a href="' + url + '" class="full-unstyled-link"><span class="visually-hidden">' + escapeHtml(p.title) + '</span></a>' +
      '<div class="card-information__wrapper">' +
      '<a href="' + url + '" class="card-information__text h4" tabindex="-1">' + escapeHtml(p.title) + '</a>' +
      '<div class="price-badge-wrapper">' +
      (compare && compare > price ? (
        '<div class="price price--on-sale">' +
        '<dl><div class="price__sale">' +
        '<dd class="price__compare"><s class="price-item price-item--regular"><bdi>' + formatPrice(compare) + '</bdi></s></dd>' +
        '<dd><span class="price-item price-item--sale"><bdi>' + formatPrice(price) + '</bdi></span></dd></dl></div></div>' +
        '<span class="badge badge--onsale">' + off + '</span>'
      ) : ('<div class="price"><span class="price-item"><bdi>' + formatPrice(price) + '</bdi></span></div>')) +
      '</div></div></div>' +
      '</use-animate></div></li>';
  }
  var grid = document.getElementById('product-grid');
  if (!grid) return;
  fetch('/products.json')
    .then(function(r) { return r.json(); })
    .then(function(products) {
      grid.innerHTML = '';
      products.forEach(function(p) {
        grid.insertAdjacentHTML('beforeend', renderCard(p));
      });
    })
    .catch(function(e) { console.error('Products load failed', e); });
})();
