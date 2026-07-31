import React, { useState } from 'react';
import portalService from '../../api/portalService';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatarData, rotuloTipoDocumento } from '../../utils/portalLabels';

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENTOS LIBERADOS AO CLIENTE
//
// A lista vem de `GET /portal/documentos`, que só devolve o que tem
// `visivelPortal && ativo && origem: "gerado"`. A tela não filtra nada: o que
// chega é o que pode aparecer.
//
// Os botões saem de `formatosDisponiveis`, e não de uma dupla fixa PDF/DOCX.
// Hoje o backend devolve sempre os dois; presumir isso na tela faria um
// terceiro formato — ou a remoção de um — passar despercebido, e o cliente
// veria um botão que baixa erro.
// ═══════════════════════════════════════════════════════════════════════════

const ROTULO_FORMATO = {
  pdf: 'Baixar PDF',
  docx: 'Baixar Word',
};

function PortalDocumentList({ documentos }) {
  const [baixando, setBaixando] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const baixar = async (documento, formato) => {
    const chave = `${documento.id}-${formato}`;
    setBaixando(chave);
    setErro('');
    setAviso('');

    try {
      const { nome, tamanho } = await portalService.baixarEsalvar(documento.id, formato);
      const kb = tamanho ? ` (${Math.round(tamanho / 1024)} kB)` : '';
      // Confirmação na própria tela, e não por notificação flutuante: no
      // celular a notificação some antes de ser lida, e o cliente fica sem
      // saber se o download aconteceu.
      setAviso(`${nome}${kb} foi baixado.`);
    } catch (err) {
      setErro(getApiErrorMessage(err, `Não foi possível baixar em ${formato.toUpperCase()}.`));
    } finally {
      setBaixando('');
    }
  };

  // ── Estado vazio ────────────────────────────────────────────────────────
  // Um cliente sem documento liberado precisa entender que está tudo certo e
  // ainda não há nada — não achar que a tela quebrou ou que perdeu algo.
  if (documentos.length === 0) {
    return (
      <div className="portal-vazio">
        <p className="portal-vazio__titulo">Nenhum documento disponível ainda</p>
        <p className="portal-vazio__texto">
          Está tudo certo com o seu acesso. A advogada ainda não liberou nenhum
          documento deste processo para consulta. Quando liberar, ele aparece
          aqui e você poderá baixá-lo.
        </p>
      </div>
    );
  }

  return (
    <>
      {erro && (
        <p className="portal-erro" role="alert">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="portal-sucesso" role="status">
          {aviso}
        </p>
      )}

      <ul className="portal-lista">
        {documentos.map((documento) => (
          <li key={documento.id} className="portal-doc">
            <p className="portal-doc__nome">{documento.nome}</p>
            <p className="portal-doc__meta">
              {rotuloTipoDocumento(documento.tipo)}
              {documento.dataGeracao ? ` · ${formatarData(documento.dataGeracao)}` : ''}
            </p>

            {documento.descricao && (
              <p className="portal-doc__descricao">{documento.descricao}</p>
            )}

            <div className="portal-acoes">
              {(documento.formatosDisponiveis ?? []).map((formato) => {
                const chave = `${documento.id}-${formato}`;
                return (
                  <button
                    key={formato}
                    type="button"
                    className="portal-btn portal-btn--secundario portal-btn--linha"
                    onClick={() => baixar(documento, formato)}
                    disabled={baixando !== ''}
                  >
                    {baixando === chave
                      ? 'Baixando…'
                      : (ROTULO_FORMATO[formato] ?? `Baixar ${formato.toUpperCase()}`)}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default PortalDocumentList;
