/* Merch — Mayo 214
   Elige talla y el botón lleva directo al checkout de Shopify con esa talla.
   Los enlaces se pegan aquí cuando el cliente pase los productos.
   Formato del enlace de checkout de Shopify: https://TIENDA/cart/ID_VARIANTE:1  */

var MERCH_TIENDA = {
  blanca: { S: '', M: '', L: '', XL: '', XXL: '' },
  negra:  { S: '', M: '', L: '', XL: '', XXL: '' }
};

(function () {
  var tarjetas = document.querySelectorAll('.camiseta');

  Array.prototype.forEach.call(tarjetas, function (tarjeta) {
    var color = tarjeta.getAttribute('data-color');
    var boton = tarjeta.querySelector('.comprar');
    var botones = tarjeta.querySelectorAll('.talla');
    var elegida = null;

    function refresca() {
      boton.disabled = !elegida;
      boton.textContent = elegida ? 'Comprar · talla ' + elegida : 'Selecciona una talla';
    }

    Array.prototype.forEach.call(botones, function (b) {
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(botones, function (o) {
          o.setAttribute('aria-checked', 'false');
        });
        b.setAttribute('aria-checked', 'true');
        elegida = b.getAttribute('data-talla');
        refresca();
      });
    });

    boton.addEventListener('click', function () {
      var url = MERCH_TIENDA[color] && MERCH_TIENDA[color][elegida];
      if (!url) {
        boton.textContent = 'Falta el enlace de Shopify';
        setTimeout(refresca, 2200);
        return;
      }
      window.location.href = url;
    });

    refresca();
  });
})();
