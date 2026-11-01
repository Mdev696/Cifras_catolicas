const SUPABASE_URL = 'https://hpwnhczyvmvyznmnnlee.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhwd25oY3p5dm12eXpubW5ubGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTYyODUsImV4cCI6MjA5NzQ3MjI4NX0.WRzXI2l_OovmQz40wvtog3_AUZNbfgGYO6kDVp1g1Fc';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const notasEscala = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
let todasMusicas = [];
let musicaAtiva = null;
let deslocamento = 0;
let tamanhoFonte = 16;
let editandoId = null;
let modoSelecaoDOC = false;
let modoCadastro = false;
let modoColunas = false;
let fonteColunas = null;   // null = ajusta sozinha para caber tudo; número = tamanho escolhido

function esc(t) {
    return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- MODO SELEÇÃO E GERADOR DE DOCUMENTO ---
function toggleModoSelecao() {
    modoSelecaoDOC = !modoSelecaoDOC;
    const container = document.getElementById('lista-musicas');
    const btnDoc = document.getElementById('btn-doc-mode');

    if (modoSelecaoDOC) {
        container.classList.add('modo-selecao-ativo');
        btnDoc.innerText = "CONFIRMAR DOWNLOAD";
        btnDoc.classList.add('confirmando');
        alert("Selecione as músicas e clique no botão verde para baixar.");
    } else {
        const marcados = document.querySelectorAll('.checkbox-selecao:checked');
        if (marcados.length > 0) {
            gerarDocumento(marcados);
        }
        container.classList.remove('modo-selecao-ativo');
        btnDoc.innerText = "BAIXAR DOC";
        btnDoc.classList.remove('confirmando');
        document.querySelectorAll('.checkbox-selecao').forEach(c => c.checked = false);
    }
}

function gerarDocumento(marcados) {
    let conteudoFinal = "";

    marcados.forEach((cb) => {
        const m = todasMusicas.find(mus => mus.id === cb.value);
        if (m) {
            conteudoFinal += `------------------------------------------\r\n`;
            conteudoFinal += `${m.titulo.toUpperCase()}\r\n`;
            conteudoFinal += `Categoria: ${m.categoria}${m.momento ? ' - ' + m.momento : ''}\r\n`;
            conteudoFinal += `------------------------------------------\r\n\r\n`;
            conteudoFinal += `${m.conteudo}\r\n\r\n\r\n`;
        }
    });

    // Criar o arquivo e disparar download
    const blob = new Blob([conteudoFinal], { type: "application/msword" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "meu_repertorio.doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- FUNÇÕES DE DADOS E INTERFACE ---
async function baixarDados() {
    const { data } = await _supabase.from('musicas').select('*').order('titulo', { ascending: true });
    todasMusicas = data || [];
    atualizarVisao();
}

// --- MISSA: MOMENTOS (ordem da celebração) ---
const MOMENTOS_ORDEM = ["Entrada", "Glória", "Ato penitencial", "Salmos", "Aclamação", "Ofertório", "Santo", "Cordeiro", "Comunhão", "Ação de graças", "Final"];
const MOMENTOS_ALFABETICO = [...MOMENTOS_ORDEM].sort((a, b) => a.localeCompare(b, 'pt-BR'));

let filtroAtual = 'Missa';
let modoMissa = 'repertorio';   // 'repertorio' | 'categoria'
let momentoAtual = 'Todos';
let termoBusca = '';

function ordenar(lista) {
    return lista.slice().sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

function criarCard(m) {
    const div = document.createElement('div');
    div.className = 'card-musica';
    const rotulo = esc(m.categoria) + (m.momento ? ' · ' + esc(m.momento) : '');
    div.innerHTML = `
        <input type="checkbox" class="checkbox-selecao" value="${m.id}">
        <div class="info-musica"><b>${esc(m.titulo)}</b><small>${rotulo}</small></div>
        <button class="btn-apagar" aria-label="Apagar" onclick="apagarMusica('${m.id}', event)">×</button>`;

    div.querySelector('.info-musica').onclick = () => {
        if (modoSelecaoDOC) {
            const c = div.querySelector('.checkbox-selecao');
            c.checked = !c.checked;
        } else {
            musicaAtiva = m; deslocamento = 0; abrirCifra();
        }
    };
    return div;
}

function renderizar(lista) {
    const container = document.getElementById('lista-musicas');
    container.innerHTML = "";
    if (lista.length === 0) {
        container.innerHTML = '<p class="vazio">Nenhuma cifra encontrada.</p>';
        return;
    }
    lista.forEach(m => container.appendChild(criarCard(m)));
}

// Missa "por repertório": seções na ordem da celebração
function renderizarRepertorio(lista) {
    const container = document.getElementById('lista-musicas');
    container.innerHTML = "";

    const criarSecao = (numero, nome, musicas) => {
        const titulo = document.createElement('h3');
        titulo.className = 'secao-momento';
        titulo.innerHTML = `<span class="num">${numero}</span>${esc(nome)}`;
        container.appendChild(titulo);
        if (musicas.length === 0) {
            const vazio = document.createElement('p');
            vazio.className = 'secao-vazia';
            vazio.innerText = 'Nenhuma cifra neste momento.';
            container.appendChild(vazio);
        } else {
            musicas.forEach(m => container.appendChild(criarCard(m)));
        }
    };

    MOMENTOS_ORDEM.forEach((momento, i) => {
        criarSecao(i + 1, momento, ordenar(lista.filter(m => m.momento === momento)));
    });

    const semMomento = ordenar(lista.filter(m => !MOMENTOS_ORDEM.includes(m.momento)));
    if (semMomento.length > 0) criarSecao('?', 'Sem momento definido', semMomento);
}

function atualizarVisao() {
    const emMissa = filtroAtual === 'Missa' && !termoBusca;

    document.getElementById('sub-missa').style.display = emMissa ? 'block' : 'none';
    document.getElementById('chips-momentos').style.display = (emMissa && modoMissa === 'categoria') ? 'flex' : 'none';
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('ativo', b.dataset.modo === modoMissa));
    document.querySelectorAll('#chips-momentos .btn-cat').forEach(b => b.classList.toggle('ativo', b.dataset.momento === momentoAtual));

    if (termoBusca) {
        renderizar(ordenar(todasMusicas.filter(m => m.titulo.toLowerCase().includes(termoBusca))));
    } else if (filtroAtual === 'Missa') {
        const missa = todasMusicas.filter(m => m.categoria === 'Missa');
        if (modoMissa === 'repertorio') {
            renderizarRepertorio(missa);
        } else {
            renderizar(ordenar(momentoAtual === 'Todos' ? missa : missa.filter(m => m.momento === momentoAtual)));
        }
    } else {
        renderizar(ordenar(filtroAtual === 'A-Z' ? todasMusicas : todasMusicas.filter(m => m.categoria === filtroAtual)));
    }
}

function setModoMissa(modo) {
    modoMissa = modo;
    momentoAtual = 'Todos';
    atualizarVisao();
}

function setMomento(m) {
    momentoAtual = m;
    atualizarVisao();
}

function montarChipsMomentos() {
    const box = document.getElementById('chips-momentos');
    box.innerHTML = "";
    ["Todos", ...MOMENTOS_ALFABETICO].forEach(nome => {
        const b = document.createElement('button');
        b.className = 'btn-cat' + (nome === momentoAtual ? ' ativo' : '');
        b.dataset.momento = nome;
        b.innerText = nome;
        b.onclick = () => setMomento(nome);
        box.appendChild(b);
    });
}

// Formulário de cifra: campo "momento da missa"
function preencherMomentos() {
    const sel = document.getElementById('adm-momento');
    sel.innerHTML = '<option value="">Momento da missa (opcional)</option>' +
        MOMENTOS_ORDEM.map(m => `<option value="${m}">${m}</option>`).join('');
}

function atualizarCampoMomento() {
    const ehMissa = document.getElementById('adm-categoria').value === 'Missa';
    document.getElementById('adm-momento').style.display = ehMissa ? 'block' : 'none';
}

function abrirCifra() {
    fonteColunas = null;
    document.getElementById('area-cifra').style.display = 'flex';
    document.getElementById('titulo-view').innerText = musicaAtiva.titulo;
    atualizarCifraVisor();
}

// --- CIFRA: TRANSPOSIÇÃO (mantém o alinhamento como foi colado) ---
const REGEX_ACORDE = /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M)?\d*(?:(?:sus|add)\d*)?(?:\/[A-G][#b]?)?$/;

function normalizarCifra(t) {
    return String(t ?? '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ');
}

// Só transpõe linhas formadas apenas por acordes (não mexe na letra)
function ehLinhaDeAcordes(linha) {
    const tokens = linha.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    let acordes = 0;
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (REGEX_ACORDE.test(t)) acordes++;
        else if (/^(\||-|\(|\)|x?\d+x?|\/)$/.test(t)) continue;
        else if (i === 0 && t.endsWith(':')) continue;
        else return false;
    }
    return acordes > 0;
}

function transporNota(nota, st) {
    const mapB = { "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#" };
    if (mapB[nota]) nota = mapB[nota];
    const idx = notasEscala.indexOf(nota);
    if (idx === -1) return nota;
    return notasEscala[(((idx + st) % 12) + 12) % 12];
}

function transporAcorde(ac, st) {
    if (st === 0) return ac;
    const m = ac.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
    if (!m) return ac;
    return transporNota(m[1], st) + m[2] + (m[3] ? '/' + transporNota(m[3], st) : '');
}

function montarCifraHtml(texto, st) {
    return normalizarCifra(texto).split('\n').map(linha => {
        if (!ehLinhaDeAcordes(linha)) return esc(linha);
        return linha.replace(/(\S+)( *)/g, (m, tok, esp) => {
            if (!REGEX_ACORDE.test(tok)) return esc(tok) + esp;
            const novo = transporAcorde(tok, st);
            const d = novo.length - tok.length;
            // ajusta os espaços para o que vem depois continuar na mesma coluna
            const n = esp.length > 0 ? Math.max(esp.length - d, 1) : 0;
            return `<span class="nota-musical">${esc(novo)}</span>` + ' '.repeat(n);
        });
    }).join('\n');
}

function atualizarCifraVisor() {
    const visor = document.getElementById('visor-cifra');
    const html = montarCifraHtml(musicaAtiva.conteudo, deslocamento);
    visor.innerHTML = modoColunas ? agruparBlocos(html) : html;
    document.getElementById('display-tom').innerText = deslocamento === 0 ? "Original" : `Tom: ${deslocamento > 0 ? '+' : ''}${deslocamento}`;
    if (modoColunas) ajustarColunas();
}

async function salvarCifra() {
    const p = {
        titulo: document.getElementById('adm-titulo').value,
        categoria: document.getElementById('adm-categoria').value,
        conteudo: normalizarCifra(document.getElementById('adm-conteudo').value),
        momento: document.getElementById('adm-categoria').value === 'Missa'
            ? (document.getElementById('adm-momento').value || null) : null
    };
    let res = editandoId ? await _supabase.from('musicas').update(p).eq('id', editandoId) : await _supabase.from('musicas').insert([p]);
    if (res.error) alert(res.error.message); else { fecharAdmin(); baixarDados(); if (editandoId) fecharCifra(); }
}

function editarMusicaAtiva() {
    if (!musicaAtiva) return;
    editandoId = musicaAtiva.id;
    document.getElementById('admin-header').innerText = "Editar Cifra";
    document.getElementById('adm-titulo').value = musicaAtiva.titulo;
    document.getElementById('adm-categoria').value = musicaAtiva.categoria;
    document.getElementById('adm-conteudo').value = musicaAtiva.conteudo;
    document.getElementById('adm-momento').value = musicaAtiva.momento || '';
    atualizarCampoMomento();
    abrirAdmin();
}

async function apagarMusica(id, event) {
    event.stopPropagation();
    if (confirm("Apagar cifra?")) { await _supabase.from('musicas').delete().eq('id', id); baixarDados(); }
}

// --- AUXILIARES ---
function toggleDarkMode() {
    const escuro = document.body.classList.toggle('dark-mode');
    try { localStorage.setItem('tema', escuro ? 'dark' : 'light'); } catch (e) { }
}
function fecharCifra() { document.getElementById('area-cifra').style.display = 'none'; }
function abrirAdmin() { document.getElementById('area-admin').style.display = 'block'; }
function fecharAdmin() {
    document.getElementById('area-admin').style.display = 'none';
    document.getElementById('admin-header').innerText = "Nova Cifra";
    document.getElementById('adm-titulo').value = '';
    document.getElementById('adm-conteudo').value = '';
    document.getElementById('adm-momento').value = '';
    editandoId = null;
}
function ajustarTom(v) { deslocamento += v; atualizarCifraVisor(); }
function alterarFonte(d) {
    const visor = document.getElementById('visor-cifra');
    if (modoColunas) {
        // em 2 colunas: parte do tamanho que está na tela; se passar do que cabe, segue nas próximas colunas
        const atual = parseFloat(getComputedStyle(visor).fontSize);
        fonteColunas = Math.min(40, Math.max(8, atual + d));
        ajustarColunas();
        return;
    }
    tamanhoFonte = Math.max(8, tamanhoFonte + d);
    visor.style.fontSize = tamanhoFonte + 'px';
}
function pesquisar(t) { termoBusca = t.trim().toLowerCase(); atualizarVisao(); }
function filtrar(c) {
    filtroAtual = c;
    termoBusca = '';
    momentoAtual = 'Todos';
    document.querySelector('.barra-busca').value = '';
    document.querySelectorAll('.menu-playlists .btn-cat').forEach(b => b.classList.toggle('ativo', b.dataset.cat === c));
    atualizarVisao();
}

// --- AUTH ---
function alternarSenha() {
    const campo = document.getElementById('senha');
    const mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    document.getElementById('btn-olho').classList.toggle('mostrando', mostrar);
}

function alternarModoAuth() {
    modoCadastro = !modoCadastro;
    document.getElementById('auth-titulo').innerText = modoCadastro ? "Crie sua conta" : "Seu canto tem lugar aqui";
    document.getElementById('auth-sub').innerText = modoCadastro
        ? "Cadastre-se para guardar suas cifras e montar o repertório de cada celebração."
        : "Entre para organizar suas cifras e preparar cada celebração com tranquilidade.";
    document.getElementById('btn-auth-texto').innerText = modoCadastro ? "Criar conta" : "Entrar";
    document.getElementById('auth-troca-texto').innerText = modoCadastro ? "Já tem uma conta?" : "Ainda não tem uma conta?";
    document.getElementById('auth-troca-btn').innerText = modoCadastro ? "Entrar" : "Registrar";
    document.getElementById('senha').autocomplete = modoCadastro ? "new-password" : "current-password";
}

function enviarAuth() { modoCadastro ? cadastrar() : entrar(); }

async function entrar() {
    const { error } = await _supabase.auth.signInWithPassword({
        email: document.getElementById('email').value, password: document.getElementById('senha').value
    });
    if (error) alert(error.message);
}

async function cadastrar() {
    const { error } = await _supabase.auth.signUp({
        email: document.getElementById('email').value, password: document.getElementById('senha').value
    });
    if (error) alert(error.message); else alert("Confirme o e-mail cadastrado!");
}

async function sair() { await _supabase.auth.signOut(); }

_supabase.auth.onAuthStateChange((event, session) => {
    if (session) { document.getElementById('tela-auth').style.display = 'none'; baixarDados(); }
    else { document.getElementById('tela-auth').style.display = 'flex'; }
});

try { if (localStorage.getItem('tema') === 'dark') document.body.classList.add('dark-mode'); } catch (e) { }

preencherMomentos();
atualizarCampoMomento();
montarChipsMomentos();

// --- CIFRA EM 2 COLUNAS (como uma partitura de 2 páginas) ---
// Junta as linhas em blocos (separados por linha em branco) para a coluna
// não cortar um acorde longe da sua letra.
function agruparBlocos(html) {
    const blocos = [];
    let atual = [];
    html.split('\n').forEach(l => {
        if (l.replace(/<[^>]+>/g, '').trim() === '') {
            if (atual.length) { blocos.push(atual); atual = []; }
        } else {
            atual.push(l);
        }
    });
    if (atual.length) blocos.push(atual);
    return blocos.map(b => `<div class="bloco">${b.join('\n')}</div>`).join('');
}

// Reduz a fonte até a cifra inteira caber nas 2 colunas, sem rolagem
function ajustarColunas() {
    const area = document.getElementById('area-cifra');
    if (area.style.display === 'none') return;
    const corpo = document.querySelector('.cifra-corpo');
    const visor = document.getElementById('visor-cifra');

    const cs = getComputedStyle(visor);
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const gap = parseFloat(cs.columnGap) || 32;
    const maiorLinha = Math.max(1, ...visor.textContent.split('\n').map(l => l.length));
    const larguraColuna = () => (visor.clientWidth - pad - gap) / 2;

    if (fonteColunas == null) {
        // automático: reduz até a cifra inteira caber nas 2 colunas
        let f = tamanhoFonte;
        visor.style.fontSize = f + 'px';
        while (f > 8) {
            const linhaCabe = maiorLinha * f * 0.6 <= larguraColuna();
            const semRolagem = corpo.scrollWidth <= corpo.clientWidth + 1;
            if (linhaCabe && semRolagem) break;
            f -= 0.5;
            visor.style.fontSize = f + 'px';
        }
    } else {
        // manual: respeita o tamanho escolhido (o resto continua nas colunas seguintes);
        // só limita para a linha mais larga não invadir a outra coluna
        const maxPorLargura = larguraColuna() / (maiorLinha * 0.6);
        visor.style.fontSize = Math.max(8, Math.min(fonteColunas, maxPorLargura)) + 'px';
    }
    area.classList.toggle('fonte-manual', fonteColunas != null);
}

function ajustarAutomatico() {
    fonteColunas = null;
    const corpo = document.querySelector('.cifra-corpo');
    corpo.scrollLeft = 0;
    ajustarColunas();
}

function alternarColunas() {
    modoColunas = !modoColunas;
    fonteColunas = null;
    const area = document.getElementById('area-cifra');
    const visor = document.getElementById('visor-cifra');
    const corpo = document.querySelector('.cifra-corpo');
    area.classList.toggle('modo-colunas', modoColunas);
    document.getElementById('btn-colunas').classList.toggle('ativo', modoColunas);
    document.getElementById('btn-colunas').innerText = modoColunas ? '▮ 1 coluna' : '▯▯ 2 colunas';
    corpo.scrollTop = 0;
    corpo.scrollLeft = 0;
    if (!modoColunas) {
        area.classList.remove('fonte-manual');
        visor.style.fontSize = tamanhoFonte + 'px';
    }
    atualizarCifraVisor();
}

window.addEventListener('resize', () => { if (modoColunas) ajustarColunas(); });