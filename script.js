document.addEventListener('DOMContentLoaded', function () {
  const addButtons = document.querySelectorAll('.add-btn');
  const cartModal = document.getElementById('cartModal');
  const closeModal = document.querySelector('.close');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const whatsappSelect = document.getElementById('whatsappSelect');

  // SheetDB endpoint
  const SHEETDB_URL = 'https://sheetdb.io/api/v1/fjwc33dbd1270';

  let cart = [];

  function montarMensagemPedido(name, address, obs, cart) {
    const formatCurrency = value => new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);

    // Emojis por Unicode (garante compatibilidade)
    const emojiNome = "\u{1F464}";      // 👤
    const emojiEndereco = "\u{1F4CD}";  // 📍
    const emojiObs = "\u{1F4DD}";       // 📝
    const emojiItens = "\u{1F6D2}";     // 🛒
    const emojiTotal = "\u{1F4B0}";     // 💰

    let message = `Pedido Vital Água\n`;
    message += `${emojiNome} Nome: ${name}\n`;
    message += `${emojiEndereco} Endereço: ${address}\n`;
    if (obs) message += `${emojiObs} Observações: ${obs}\n`;
    message += `\n${emojiItens} Itens do pedido:\n`;

    cart.forEach(item => {
      const optionText = item.option.split(' - R$')[0];
      const entregaOuRetirada = item.delivery === 'entrega' ? 'com entrega' : 'retirada';
      message += `- ${item.name} (${optionText} - ${entregaOuRetirada} - quantidade ${item.quantity})\n`;
    });

    const total = cart.reduce((acc, item) => acc + item.totalPrice, 0);
    message += `\n${emojiTotal} Total: ${formatCurrency(total)}\n`;

    return message;
  }

  function renderCart() {
    if (!cartItems || !cartTotal) return;
    cartItems.innerHTML = '';
    let total = 0;
    cart.forEach((item, idx) => {
      const li = document.createElement('li');
      li.textContent = `${item.name} (${item.option}, ${item.delivery}, x${item.quantity}) - R$ ${item.totalPrice.toFixed(2)} `;

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remover';
      removeBtn.style.marginLeft = '10px';
      removeBtn.onclick = () => {
        cart.splice(idx, 1);
        renderCart();
      };
      li.appendChild(removeBtn);

      cartItems.appendChild(li);
      total += item.totalPrice;
    });
    cartTotal.innerText = total.toFixed(2);
  }

  function closeCart() {
    if (cartModal) {
      cartModal.style.display = 'none';
      cartModal.classList.remove('show');
    }
    cart = [];
    renderCart();
  }

  if (addButtons && cartModal) {
    addButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.product-card');
        if (!card) return;
        const name = card.querySelector('h2').innerText;
        const option = card.querySelector('.option-select').value;
        const deliverySelect = card.querySelector('.delivery-select');
        const delivery = deliverySelect.value;
        const deliveryExtra = parseFloat(deliverySelect.selectedOptions[0].dataset.extra);
        const quantity = parseInt(card.querySelector('.quantity').value);

        let price = parseFloat(option.split('R$')[1].replace(',', '.'));
        let totalPrice = (price + deliveryExtra) * quantity;

        cart.push({ name, option, delivery, quantity, totalPrice });
        renderCart();
        cartModal.style.display = 'block';
        cartModal.classList.add('show');
      });
    });
  }

  if (closeModal) closeModal.addEventListener('click', closeCart);
  if (cartModal) {
    window.addEventListener('click', e => { if (e.target === cartModal) closeCart(); });
  }
  window.addEventListener('keydown', e => { if (e.key === "Escape") closeCart(); });

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('nameInput');
      const addressInput = document.getElementById('addressInput');
      const obsInput = document.getElementById('obsInput');
      if (!nameInput || !addressInput || !whatsappSelect) return;

      const name = nameInput.value;
      const address = addressInput.value;
      const obs = obsInput ? obsInput.value : '';
      const whatsappRaw = whatsappSelect.value;
      const whatsapp = whatsappRaw.replace(/\D/g, '');

      if (!name || !address) {
        alert('Preencha seu nome e endereço.');
        return;
      }
      if (cart.length === 0) {
        alert('Seu carrinho está vazio!');
        return;
      }

      // Monta a mensagem com emojis
      const message = montarMensagemPedido(name, address, obs, cart);

      // Gera PDF para impressora térmica
      if (window.jspdf) {
        const { jsPDF } = window.jspdf;
        const largura = 58;
        let y = 10;
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [largura, 140]
        });

        const margem = 5;
        const larguraTexto = largura - 2 * margem;
        const tamanhoFonteTitulo = 10; // Títulos menores
        const tamanhoFonteTexto = 8;  // Texto do usuário menor
        const alturaLinha = 7;        // Espaçamento maior entre linhas

        // Cabeçalho
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('VITAL ÁGUA', largura / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(8);
        doc.text('Água é Vida, Água é Vital!', largura / 2, y, { align: 'center' });
        y += 8;

        // Nome
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(tamanhoFonteTitulo);
        doc.text('Nome:', margem, y);
        y += alturaLinha;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tamanhoFonteTexto);
        const nomeQuebrado = doc.splitTextToSize(name, larguraTexto);
        doc.text(nomeQuebrado, margem, y);
        y += nomeQuebrado.length * alturaLinha;

        // Endereço
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(tamanhoFonteTitulo);
        doc.text('Endereço:', margem, y);
        y += alturaLinha;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tamanhoFonteTexto);
        const enderecoQuebrado = doc.splitTextToSize(address, larguraTexto);
        doc.text(enderecoQuebrado, margem, y);
        y += enderecoQuebrado.length * alturaLinha;

        // Observação
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(tamanhoFonteTitulo);
        doc.text('Observação:', margem, y);
        y += alturaLinha;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tamanhoFonteTexto);
        const obsQuebrado = doc.splitTextToSize(obs ? obs : '-', larguraTexto);
        doc.text(obsQuebrado, margem, y);
        y += obsQuebrado.length * alturaLinha;

        // Itens do pedido
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(tamanhoFonteTitulo);
        doc.text('Itens do pedido:', margem, y);
        y += alturaLinha;

        cart.forEach(item => {
          const optionText = item.option.split(' - R$')[0];
          const entregaOuRetirada = item.delivery === 'entrega' ? 'com entrega' : 'retirada no local';
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(tamanhoFonteTexto);
          const itemNome = doc.splitTextToSize(item.name, larguraTexto);
          doc.text(itemNome, margem, y);
          y += itemNome.length * alturaLinha;
          const itemOpcao = doc.splitTextToSize(optionText, larguraTexto);
          doc.text(itemOpcao, margem, y);
          y += itemOpcao.length * alturaLinha;
          doc.text(`Quantidade: ${item.quantity}`, margem, y);
          y += alturaLinha;
          doc.text(entregaOuRetirada, margem, y);
          y += alturaLinha;
        });

        // Total
        const total = cart.reduce((acc, item) => acc + item.totalPrice, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(tamanhoFonteTitulo);
        doc.text(`TOTAL:`, margem, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tamanhoFonteTexto);
        doc.text(`R$ ${total.toFixed(2).replace('.', ',')}`, largura / 2, y);
        y += alturaLinha + 2;

        doc.save('pedido-vitalagua.pdf');
      }

      // Salva cada item do pedido no SheetDB
cart.forEach(item => {
  fetch(SHEETDB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{
        produto: item.name,
        quantidade: item.quantity,
        valorUnitario: (item.totalPrice / item.quantity).toFixed(2),
        valorTotal: item.totalPrice.toFixed(2),
        data: new Date().toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
      }]
    })
  });
});

      // Abre o WhatsApp com a mensagem (emojis garantidos)
      const whatsappURL = `https://api.whatsapp.com/send?phone=${whatsapp}&text=${encodeURIComponent(message)}`;
      window.open(whatsappURL, '_blank');
      closeCart();
    });
  }

  // ===== CARROSSEL =====
  const track = document.querySelector('.carousel-track');
  const dotsNav = document.querySelector('.carousel-dots');
  let slides = [];
  let dots = [];
  let currentIndex = 0;

  if (track && dotsNav) {
    slides = Array.from(track.children);
    dots = Array.from(dotsNav.children);

    function moveToSlide(index) {
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach(dot => dot.classList.remove('active'));
      if (dots[index]) dots[index].classList.add('active');
      currentIndex = index;
    }

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => moveToSlide(i));
    });

    setInterval(() => {
      let nextIndex = (currentIndex + 1) % slides.length;
      moveToSlide(nextIndex);
    }, 5000);
  }
});

// ===== HISTÓRICO DE PEDIDOS =====
window.abrirHistorico = function() {
  document.getElementById('historicoModal').style.display = 'block';
}
window.fecharHistorico = function() {
  document.getElementById('historicoModal').style.display = 'none';
  document.getElementById('tabelaHistorico').innerHTML = '';
}
// ...existing code...
window.verHistorico = function() {
  const senha = document.getElementById('senhaHistorico').value;
  if (senha !== 'vitalagua40') {
    alert('Senha incorreta!');
    return;
  }

  fetch('https://sheetdb.io/api/v1/fjwc33dbd1270')
    .then(res => res.json())
    .then(data => {
      if (!data.length) {
        document.getElementById('tabelaHistorico').innerHTML = '<p>Nenhum registro encontrado.</p>';
        return;
      }
      let html = '<table border="1"><tr><th>Data</th><th>Produto</th><th>Quantidade</th><th>Valor Unitário</th><th>Valor Total</th></tr>';
      data.forEach(row => {
        html += `<tr>
          <td>${row.data || ''}</td>
          <td>${row.produto || ''}</td>
          <td>${row.quantidade || ''}</td>
          <td>${row.valorUnitario || ''}</td>
          <td>${row.valorTotal || ''}</td>
        </tr>`;
      });
      html += '</table>';
      document.getElementById('tabelaHistorico').innerHTML = html;
    });
}


