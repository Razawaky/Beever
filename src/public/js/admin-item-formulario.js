(() => {
  const categoria = document.getElementById('idCategoria');
  const fieldset = document.getElementById('fieldset-cosmetico');
  const tipo = document.getElementById('tipoCosmetico');
  const campoCamada = document.getElementById('campo-camada-cosmetica');
  const camada = document.getElementById('camadaCosmetica');
  const patrimonio = document.querySelector('input[name="contaNoPatrimonio"]');
  if (!categoria || !fieldset || !tipo || !campoCamada || !camada) return;

  const ehCategoriaCosmetico = () => {
    const opcao = categoria.selectedOptions?.[0] ?? categoria.options[categoria.selectedIndex];
    return opcao?.dataset.slug === 'cosmeticos';
  };

  const sincronizar = () => {
    const cosmetico = ehCategoriaCosmetico();
    fieldset.classList.toggle('hidden', !cosmetico);
    tipo.required = cosmetico;

    if (!cosmetico) {
      tipo.value = '';
      camada.value = '';
      camada.required = false;
      campoCamada.classList.add('hidden');
      return;
    }

    const ehAvatar = tipo.value === 'avatar';
    campoCamada.classList.toggle('hidden', !ehAvatar);
    camada.required = ehAvatar;
    if (!ehAvatar) camada.value = '';
    if (tipo.value && patrimonio) patrimonio.checked = false;
  };

  categoria.addEventListener('change', sincronizar);
  tipo.addEventListener('change', sincronizar);
  sincronizar();
})();
