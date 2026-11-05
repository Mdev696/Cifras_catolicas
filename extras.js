/* =====================================================================
   EXTRAS - Cifras Católicas Pro
   1) Repertórios salvos (guardam CÓPIA COMPLETA das músicas no banco)
   2) Mover / copiar música entre categorias + adicionar a repertório
   3) Nova categoria "Música Mariana"
   Não altera o código existente: só acrescenta.
   Carregar DEPOIS do script.js
   ===================================================================== */
(function () {

    // ---------- CONFIG ----------
    const NOVA_CATEGORIA = 'Música Mariana';
    const CATEGORIAS = ['Missa', 'Salmo', 'Grupo de Oração', 'Adoração', NOVA_CATEGORIA, 'Aleatório', 'Terço'];

    // ---------- ESTILO ----------
    const css = `
    .ex-overlay{position:fixed;inset:0;z-index:300;background:rgba(20,8,12,.6);display:flex;align-items:flex-end;justify-content:center}
    .ex-modal{width:100%;max-width:560px;max-height:92dvh;overflow-y:auto;background:var(--bg);color:var(--text);
        border-radius:20px 20px 0 0;padding:22px 18px calc(22px + env(safe-area-inset-bottom))}
    @media(min-width:700px){.ex-overlay{align-items:center}.ex-modal{border-radius:20px}}
    .ex-modal h3{font-family:var(--fonte-titulo);font-weight:500;font-size:24px;margin:0 0 14px}
    .ex-rot{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-suave);margin:14px 0 6px}
    .ex-input{display:block;width:100%;padding:13px 14px;margin-bottom:10px;border:1px solid var(--borda);
        border-radius:12px;background:var(--card);color:var(--text);font-family:inherit;font-size:16px;outline:none}
    .ex-btn{width:100%;height:48px;margin-top:8px;border:0;border-radius:12px;background:var(--vinho-2);
        color:#fff;font-size:15px;font-weight:600}
    .ex-btn.sec{background:var(--card);color:var(--text);border:1px solid var(--borda)}
    .ex-btn.verde{background:var(--verde)}
    .ex-linha{display:flex;gap:8px}
    .ex-linha .ex-btn{flex:1}
    .ex-cancel{width:100%;height:44px;margin-top:6px;border:0;background:none;color:var(--text-suave);font-size:15px}
    .ex-lista{max-height:220px;overflow-y:auto;border:1px solid var(--borda);border-radius:12px;background:var(--card)}
    .ex-lista:empty::after{content:"Nada por aqui ainda.";display:block;padding:14px;color:var(--text-suave);font-size:14px}
    .ex-item{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid var(--borda);font-size:15px}
    .ex-item:last-child{border-bottom:0}
    .ex-item .ex-nome{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
    .ex-item small{display:block;color:var(--text-suave);font-size:11px;letter-spacing:.06em;text-transform:uppercase}
    .ex-item button{border:0;background:none;color:var(--text-suave);font-size:16px;padding:4px 7px}
    .ex-item.marcado{background:rgba(114,47,67,.12)}
    .ex-aviso{color:var(--text-suave);font-size:12px}
    .btn-mover{border:0;background:none;padding:0 6px;font-size:20px;line-height:1;color:var(--text-suave)}
    `;
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    // ---------- UTIL ----------
    function criarModal(inner) {
        const ov = document.createElement('div');
        ov.className = 'ex-overlay';
        ov.innerHTML = `<div class="ex-modal">${inner}</div>`;
        ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
        document.body.appendChild(ov);
        return ov;
    }
    const achar = id => todasMusicas.find(m => m.id === id);

    // Cópia completa da música (é isto que fica guardado dentro do repertório)
    const snap = m => ({
        id: m.id, titulo: m.titulo, categoria: m.categoria,
        momento: m.momento || null, conteudo: m.conteudo
    });

    // Aceita o formato antigo (só o id) e o novo (cópia completa)
    function normalizar(x) {
        if (typeof x === 'string') { const v = achar(x); return v ? snap(v) : null; }
        return x && x.titulo ? x : null;
    }
    const idDe = x => (typeof x === 'string' ? x : (x && x.id));

    // Converte repertórios antigos (só ids) para cópia completa, uma vez
    async function migrar(rep) {
        const arr = rep.musicas || [];
        if (todasMusicas.length === 0 || !arr.some(x => typeof x === 'string')) return;
        const novo = arr.map(x => (typeof x === 'string' && achar(x)) ? snap(achar(x)) : x);
        rep.musicas = novo;
        await _supabase.from('repertorios').update({ musicas: novo }).eq('id', rep.id);
    }

    // Gera o DOC a partir das cópias guardadas (funciona mesmo se a música foi apagada)
    function gerarDocDeItens(itens) {
        let out = '';
        itens.forEach(m => {
            out += `------------------------------------------\r\n`;
            out += `${m.titulo.toUpperCase()}\r\n`;
            out += `Categoria: ${m.categoria}${m.momento ? ' - ' + m.momento : ''}\r\n`;
            out += `------------------------------------------\r\n\r\n`;
            out += `${m.conteudo}\r\n\r\n\r\n`;
        });
        const blob = new Blob([out], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'meu_repertorio.doc';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // =====================================================================
    // 3) NOVA CATEGORIA
    // =====================================================================
    const nav = document.getElementById('nav-categorias');
    const btnCat = document.createElement('button');
    btnCat.className = 'btn-cat';
    btnCat.dataset.cat = NOVA_CATEGORIA;
    btnCat.textContent = NOVA_CATEGORIA;
    btnCat.onclick = () => filtrar(NOVA_CATEGORIA);
    nav.insertBefore(btnCat, nav.querySelector('[data-cat="Aleatório"]'));

    const selAdm = document.getElementById('adm-categoria');
    const op = document.createElement('option');
    op.value = NOVA_CATEGORIA;
    op.textContent = NOVA_CATEGORIA;
    selAdm.insertBefore(op, selAdm.querySelector('option[value="Aleatório"]'));

    // =====================================================================
    // 2) MOVER / COPIAR / ADICIONAR A REPERTÓRIO  (botão ⇄ em cada card)
    // =====================================================================
    const criarCardOriginal = criarCard;
    window.criarCard = function (m) {
        const div = criarCardOriginal(m);
        const b = document.createElement('button');
        b.className = 'btn-mover';
        b.innerHTML = '⇄';
        b.setAttribute('aria-label', 'Mover, copiar ou adicionar a repertório');
        b.onclick = e => { e.stopPropagation(); abrirMover(m); };
        div.insertBefore(b, div.querySelector('.btn-apagar'));
        return div;
    };

    function abrirMover(m) {
        const destinos = CATEGORIAS.filter(c => c !== m.categoria);
        const ov = criarModal(`
            <h3></h3>
            <p class="ex-rot">Categoria atual: ${esc(m.categoria)}</p>
            <p class="ex-rot">Enviar para</p>
            <select class="ex-input" id="ex-dest">${destinos.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            <select class="ex-input" id="ex-mom" style="display:none">
                <option value="">Momento da missa (opcional)</option>
                ${MOMENTOS_ORDEM.map(x => `<option value="${x}">${x}</option>`).join('')}
            </select>
            <div class="ex-linha">
                <button class="ex-btn" id="ex-mover">Mover</button>
                <button class="ex-btn sec" id="ex-copiar">Copiar</button>
            </div>
            <p class="ex-rot">Ou adicionar a um repertório salvo</p>
            <select class="ex-input" id="ex-rep"><option value="">Carregando...</option></select>
            <button class="ex-btn verde" id="ex-addrep">Adicionar ao repertório</button>
            <button class="ex-cancel" id="ex-x">Cancelar</button>`);
        ov.querySelector('h3').textContent = m.titulo;

        const dest = ov.querySelector('#ex-dest');
        const mom = ov.querySelector('#ex-mom');
        const atualizar = () => { mom.style.display = dest.value === 'Missa' ? 'block' : 'none'; };
        dest.onchange = atualizar; atualizar();

        const executar = async (copiar) => {
            const momento = dest.value === 'Missa' ? (mom.value || null) : null;
            let res;
            if (copiar) {
                res = await _supabase.from('musicas').insert([{
                    titulo: m.titulo, categoria: dest.value, momento, conteudo: m.conteudo
                }]);
            } else {
                res = await _supabase.from('musicas').update({ categoria: dest.value, momento }).eq('id', m.id);
            }
            if (res.error) { alert(res.error.message); return; }
            ov.remove();
            baixarDados();
        };
        ov.querySelector('#ex-mover').onclick = () => executar(false);
        ov.querySelector('#ex-copiar').onclick = () => executar(true);
        ov.querySelector('#ex-x').onclick = () => ov.remove();

        // repertórios salvos
        const selRep = ov.querySelector('#ex-rep');
        _supabase.from('repertorios').select('id,nome').order('criado_em', { ascending: false }).then(({ data }) => {
            selRep.innerHTML = '';
            if (!data || data.length === 0) {
                selRep.innerHTML = '<option value="">Nenhum repertório salvo</option>';
                return;
            }
            data.forEach(r => {
                const o = document.createElement('option');
                o.value = r.id; o.textContent = r.nome;
                selRep.appendChild(o);
            });
        });

        // só ACRESCENTA (guardando a cópia completa); o resto fica intacto
        ov.querySelector('#ex-addrep').onclick = async () => {
            if (!selRep.value) { alert('Escolha um repertório.'); return; }
            const { data: atual, error: e1 } = await _supabase.from('repertorios').select('musicas').eq('id', selRep.value).single();
            if (e1) { alert(e1.message); return; }
            const lista = atual.musicas || [];
            if (lista.some(x => idDe(x) === m.id)) { alert('Esta música já está nesse repertório.'); return; }
            const { error: e2 } = await _supabase.from('repertorios').update({ musicas: [...lista, snap(m)] }).eq('id', selRep.value);
            if (e2) { alert(e2.message); return; }
            alert('Música adicionada ao repertório!');
            ov.remove();
        };
    }

    // =====================================================================
    // 1) REPERTÓRIOS SALVOS
    // =====================================================================
    const acoes = document.querySelector('.acoes');
    const btnRep = document.createElement('button');
    btnRep.className = 'btn-icone';
    btnRep.textContent = '📋';
    btnRep.setAttribute('aria-label', 'Repertórios salvos');
    btnRep.onclick = abrirRepertorios;
    acoes.insertBefore(btnRep, document.getElementById('btn-doc-mode'));

    async function abrirRepertorios() {
        const ov = criarModal(`
            <h3>Repertórios</h3>
            <div class="ex-lista" id="ex-reps" style="max-height:50dvh"><p style="padding:14px;margin:0">Carregando...</p></div>
            <button class="ex-btn verde" id="ex-novo">+ Novo repertório</button>
            <button class="ex-cancel" id="ex-x">Fechar</button>`);
        ov.querySelector('#ex-x').onclick = () => ov.remove();
        ov.querySelector('#ex-novo').onclick = () => { ov.remove(); abrirEditor(null); };

        const { data, error } = await _supabase.from('repertorios').select('*').order('criado_em', { ascending: false });
        const box = ov.querySelector('#ex-reps');
        box.innerHTML = '';
        if (error) { box.innerHTML = '<p style="padding:14px;margin:0"></p>'; box.firstChild.textContent = error.message; return; }

        // converte repertórios antigos (só ids) para cópia completa
        await Promise.all((data || []).map(migrar));

        (data || []).forEach(rep => {
            const qtd = (rep.musicas || []).length;
            const row = document.createElement('div');
            row.className = 'ex-item';
            row.innerHTML = `<span class="ex-nome"><b></b><small>${qtd} música${qtd === 1 ? '' : 's'}</small></span><button aria-label="Apagar">×</button>`;
            row.querySelector('b').textContent = rep.nome;
            row.querySelector('.ex-nome').onclick = () => { ov.remove(); abrirRepertorio(rep); };
            row.querySelector('button').onclick = async () => {
                if (!confirm('Apagar o repertório "' + rep.nome + '"? (as cifras da lista principal continuam salvas)')) return;
                await _supabase.from('repertorios').delete().eq('id', rep.id);
                ov.remove(); abrirRepertorios();
            };
            box.appendChild(row);
        });
    }

    async function restaurar(rep, it) {
        const { data, error } = await _supabase.from('musicas')
            .insert([{ titulo: it.titulo, categoria: it.categoria, momento: it.momento || null, conteudo: it.conteudo }])
            .select().single();
        if (error) { alert(error.message); return false; }
        const novo = (rep.musicas || []).map(x => (typeof x === 'object' && x.id === it.id) ? snap(data) : x);
        const r = await _supabase.from('repertorios').update({ musicas: novo }).eq('id', rep.id);
        if (r.error) { alert(r.error.message); return false; }
        rep.musicas = novo;
        await baixarDados();
        alert('Música restaurada na categoria "' + it.categoria + '".');
        return true;
    }

    function abrirRepertorio(rep) {
        const ov = criarModal(`
            <h3></h3>
            <div class="ex-lista" id="ex-musicas" style="max-height:50dvh"></div>
            <p class="ex-aviso">↺ = música apagada da lista principal. Ela continua aqui no repertório; toque no ↺ para devolvê-la à categoria.</p>
            <div class="ex-linha">
                <button class="ex-btn" id="ex-baixar">Baixar DOC</button>
                <button class="ex-btn sec" id="ex-editar">Editar</button>
            </div>
            <button class="ex-cancel" id="ex-x">Fechar</button>`);
        ov.querySelector('h3').textContent = rep.nome;

        const itens = (rep.musicas || []).map(normalizar).filter(Boolean);
        const box = ov.querySelector('#ex-musicas');
        itens.forEach((it, i) => {
            const vivo = achar(it.id);
            const m = vivo || it;      // se a música ainda existe usa a versão atual; senão a cópia guardada
            const row = document.createElement('div');
            row.className = 'ex-item';
            row.innerHTML = '<span class="ex-nome"><b></b><small></small></span>' + (vivo ? '' : '<button aria-label="Restaurar">↺</button>');
            row.querySelector('b').textContent = (i + 1) + '. ' + m.titulo;
            row.querySelector('small').textContent = m.categoria + (m.momento ? ' · ' + m.momento : '');
            row.querySelector('.ex-nome').onclick = () => {
                ov.remove();
                musicaAtiva = m; deslocamento = 0; abrirCifra();
            };
            const br = row.querySelector('button');
            if (br) br.onclick = async () => { if (await restaurar(rep, it)) { ov.remove(); abrirRepertorio(rep); } };
            box.appendChild(row);
        });

        ov.querySelector('#ex-baixar').onclick = () => {
            if (itens.length === 0) { alert('Este repertório está vazio.'); return; }
            gerarDocDeItens(itens.map(it => achar(it.id) || it));
        };
        ov.querySelector('#ex-editar').onclick = () => { ov.remove(); abrirEditor(rep); };
        ov.querySelector('#ex-x').onclick = () => ov.remove();
    }

    function abrirEditor(rep) {
        const estado = { id: rep ? rep.id : null, itens: rep ? (rep.musicas || []).map(normalizar).filter(Boolean) : [] };
        const ov = criarModal(`
            <h3>${rep ? 'Editar repertório' : 'Novo repertório'}</h3>
            <input class="ex-input" id="ex-nome" placeholder="Nome (ex: Missa de domingo)">
            <p class="ex-rot">Ordem do repertório (<span id="ex-cont">0</span>)</p>
            <div class="ex-lista" id="ex-sel"></div>
            <p class="ex-rot">Adicionar músicas</p>
            <input class="ex-input" id="ex-busca" placeholder="🔍 Pesquisar...">
            <div class="ex-lista" id="ex-all"></div>
            <button class="ex-btn verde" id="ex-salvar">${rep ? 'Atualizar este repertório' : 'Salvar repertório'}</button>
            ${rep ? '<button class="ex-btn sec" id="ex-novo-salvar">Salvar como NOVO (mantém o antigo)</button>' : ''}
            <button class="ex-cancel" id="ex-x">Cancelar</button>`);

        const nome = ov.querySelector('#ex-nome');
        const busca = ov.querySelector('#ex-busca');
        const selDiv = ov.querySelector('#ex-sel');
        const allDiv = ov.querySelector('#ex-all');
        if (rep) nome.value = rep.nome;

        function alternar(m) {
            const i = estado.itens.findIndex(x => x.id === m.id);
            if (i >= 0) estado.itens.splice(i, 1); else estado.itens.push(snap(m));
            desenhar();
        }
        function mover(i, d) {
            const j = i + d;
            if (j < 0 || j >= estado.itens.length) return;
            [estado.itens[i], estado.itens[j]] = [estado.itens[j], estado.itens[i]];
            desenhar();
        }

        function desenhar() {
            ov.querySelector('#ex-cont').textContent = estado.itens.length;
            const sTop = selDiv.scrollTop, aTop = allDiv.scrollTop;

            selDiv.innerHTML = '';
            estado.itens.forEach((it, i) => {
                const row = document.createElement('div');
                row.className = 'ex-item';
                row.innerHTML = '<span class="ex-nome"></span><button>▲</button><button>▼</button><button>×</button>';
                row.querySelector('.ex-nome').textContent = (i + 1) + '. ' + it.titulo;
                const [up, down, rm] = row.querySelectorAll('button');
                up.onclick = () => mover(i, -1);
                down.onclick = () => mover(i, 1);
                rm.onclick = () => { estado.itens.splice(i, 1); desenhar(); };
                selDiv.appendChild(row);
            });

            const t = busca.value.trim().toLowerCase();
            allDiv.innerHTML = '';
            ordenar(todasMusicas.filter(m => m.titulo.toLowerCase().includes(t))).forEach(m => {
                const marcado = estado.itens.some(x => x.id === m.id);
                const row = document.createElement('div');
                row.className = 'ex-item' + (marcado ? ' marcado' : '');
                row.innerHTML = '<span class="ex-nome"><b style="font-weight:500"></b><small></small></span><span>' + (marcado ? '✓' : '+') + '</span>';
                row.querySelector('b').textContent = m.titulo;
                row.querySelector('small').textContent = m.categoria + (m.momento ? ' · ' + m.momento : '');
                row.onclick = () => alternar(m);
                allDiv.appendChild(row);
            });

            selDiv.scrollTop = sTop; allDiv.scrollTop = aTop;
        }

        busca.oninput = desenhar;
        desenhar();

        ov.querySelector('#ex-x').onclick = () => ov.remove();

        async function salvar(comoNovo) {
            const n = nome.value.trim();
            if (!n) { alert('Dê um nome ao repertório.'); return; }
            if (estado.itens.length === 0) { alert('Adicione pelo menos uma música.'); return; }
            if (comoNovo && rep && n === rep.nome) {
                alert('Mude o nome para diferenciar do repertório antigo.'); return;
            }
            if (!comoNovo && estado.id && !confirm('Isso vai SUBSTITUIR o repertório "' + rep.nome + '". Continuar?')) return;
            // atualiza a cópia com a versão mais recente da música (se ainda existir); senão mantém a guardada
            const musicas = estado.itens.map(it => achar(it.id) ? snap(achar(it.id)) : it);
            const payload = { nome: n, musicas };
            const res = (estado.id && !comoNovo)
                ? await _supabase.from('repertorios').update(payload).eq('id', estado.id)
                : await _supabase.from('repertorios').insert([payload]);
            if (res.error) { alert(res.error.message); return; }
            ov.remove();
            abrirRepertorios();
        }
        ov.querySelector('#ex-salvar').onclick = () => salvar(false);
        const btnNovo = ov.querySelector('#ex-novo-salvar');
        if (btnNovo) btnNovo.onclick = () => salvar(true);
    }

})();