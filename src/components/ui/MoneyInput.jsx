import React, { useEffect, useRef, useState } from 'react';
import { maskMoney, parseMoney, formatMoneyInput } from '../../utils/masks.js';
import './MoneyInput.css';

// ═══════════════════════════════════════════════════════════════════════════
// ENTRADA DE DINHEIRO EM pt-BR (Fase 4.3)
//
// Substitui o `<input type="number" step="0.01">` dos três formulários
// financeiros. O que se ganha:
//
// - **Vírgula decimal.** `type="number"` em pt-BR aceita a vírgula em alguns
//   navegadores e a recusa em outros, em silêncio: a advogada digitava
//   "1500,50", o campo ficava vazio para o React e ela reenviava sem entender.
// - **Milhar visível.** "1.500,00" se confere de relance; "1500" não — e
//   `type="number"` não formata nada.
// - **Teclado numérico no celular** por `inputMode="decimal"`, sem os
//   incrementadores de seta, que num campo de honorário só servem para mudar
//   o valor por engano ao rolar a página.
//
// ── O contrato ────────────────────────────────────────────────────────────
// `value` entra como **Number em reais** (ou `null`/`''`), e `onChange` devolve
// **Number em reais** ou `null`. É o mesmo contrato da Fase 4.2, e é por isso
// que nenhum payload muda: `montarPayloadHonorario` continua fazendo
// `Number(form.valor)` e recebendo o mesmo número de antes.
//
// **Não é `onChange(evento)`.** Um componente de máscara que devolvesse evento
// obrigaria cada formulário a saber que aquele campo é diferente, e o `name`
// no evento seria a única coisa que os `handleChange` genéricos leriam — que
// é justamente o acoplamento que este componente existe para tirar da tela.
// ═══════════════════════════════════════════════════════════════════════════

function MoneyInput({
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  className,
  placeholder = '0,00',
  'aria-describedby': ariaDescribedBy,
}) {
  const [texto, setTexto] = useState(() => formatMoneyInput(value));

  // Guarda do último número que ESTE componente emitiu. Sem ela, o efeito
  // abaixo reescreveria o texto a cada tecla: o pai devolve o número que
  // acabou de receber, e "1.234," (com a vírgula recém-digitada e nenhum
  // centavo ainda) viraria "1.234,00" com o cursor no fim.
  const ultimoEmitido = useRef(parseMoney(value));

  useEffect(() => {
    const externo = parseMoney(value);
    if (externo === ultimoEmitido.current) return;
    ultimoEmitido.current = externo;
    setTexto(formatMoneyInput(externo));
  }, [value]);

  const emitir = (novoTexto) => {
    setTexto(novoTexto);
    const numero = parseMoney(novoTexto);
    ultimoEmitido.current = numero;
    onChange(numero);
  };

  // Apagar tudo devolve `null`, e não 0. Campo vazio é "não informado" —
  // convenção do projeto para campo apagado — e zero seria uma cobrança de
  // zero real, que é outra afirmação.
  const handleChange = (e) => emitir(maskMoney(e.target.value));

  // ── A tecla de ponto vira vírgula ─────────────────────────────────────────
  //
  // Teclado numérico de notebook tem ponto e não tem vírgula, e recusar a
  // tecla que a pessoa tem à mão é a tela sendo mais rígida que a API.
  //
  // A tradução acontece AQUI, no evento de tecla, e não dentro de `maskMoney`.
  // A máscara é reaplicada sobre a própria saída a cada digitação: com
  // "1.500" na tela ela não tem como saber se um ponto é decimal ou o milhar
  // que ela mesma inseriu — e o palpite erraria ao apagar um dígito, que é
  // quando ninguém está prestando atenção. No evento de tecla não há palpite:
  // houve um `.` pressionado, numa posição conhecida.
  const handleKeyDown = (e) => {
    if (e.key !== '.' && e.key !== 'Decimal') return;
    e.preventDefault();
    const campo = e.target;
    const inicio = campo.selectionStart ?? campo.value.length;
    const fim = campo.selectionEnd ?? inicio;
    emitir(maskMoney(`${campo.value.slice(0, inicio)},${campo.value.slice(fim)}`));
  };

  // A colagem não passa pela máscara de digitação: `maskMoney` descarta ponto
  // como separador de milhar e "1.234,56" viraria "1.234,56" por sorte, mas
  // "1234.56" (formato de extrato e de CSV) viraria 1.23456 → "1.234,56" por
  // acidente. `parseMoney` resolve os dois formatos com regra escrita, e o
  // resultado é reformatado a partir do NÚMERO.
  const handlePaste = (e) => {
    const colado = e.clipboardData?.getData('text');
    if (colado == null) return;
    const numero = parseMoney(colado);
    if (numero == null) return;
    e.preventDefault();
    setTexto(formatMoneyInput(numero));
    ultimoEmitido.current = numero;
    onChange(numero);
  };

  // Ao sair do campo, "1.234," e "1.234,5" viram "1.234,00" e "1.234,50". O
  // acerto acontece no `blur` e não a cada tecla, porque completar os centavos
  // enquanto ela digita mudaria o texto embaixo do cursor.
  const handleBlur = () => {
    const numero = parseMoney(texto);
    setTexto(formatMoneyInput(numero));
  };

  return (
    <div className={`money-input${disabled ? ' money-input--disabled' : ''}`}>
      <span className="money-input__prefixo" aria-hidden="true">R$</span>
      <input
        id={id}
        name={name}
        type="text"
        // `decimal` e não `numeric`: no iOS o `numeric` abre um teclado sem
        // vírgula, e o campo ficaria impossível de preencher com centavos.
        inputMode="decimal"
        autoComplete="off"
        value={texto}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        aria-describedby={ariaDescribedBy}
      />
    </div>
  );
}

export default MoneyInput;
