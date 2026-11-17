const GRUPOS_TREINO = {
  aquecimento: { nome: 'Aquecimento', cor: '#f7c56b' },
  alongamento: { nome: 'Alongamento', cor: '#8fd3ff' },
  abdomen: { nome: 'Abdômen', cor: '#f59ad8' },
  pernas: { nome: 'Pernas', cor: '#9b8cff' },
  gluteos: { nome: 'Glúteos', cor: '#c49bff' },
  bracos: { nome: 'Braços', cor: '#ff9f7a' },
  peito: { nome: 'Peito', cor: '#ff7a8a' },
  costas: { nome: 'Costas', cor: '#5fd6a4' },
  ombros: { nome: 'Ombros', cor: '#7ad7d0' },
  cardio: { nome: 'Cardio', cor: '#ffb86b' },
};
const EQUIPAMENTOS = { nenhum: 'Sem equipamento', cadeira: 'Cadeira ou banco', halter: 'Halter ou garrafa', elastico: 'Elástico', parede: 'Parede', toalha: 'Toalha', mochila: 'Mochila com peso' };
const NIVEIS = ['', 'Iniciante', 'Intermediário', 'Avançado'];

const ex = (id, nome, grupo, equip, nivel, tipo, padrao, musculos, passos, dica) =>
  ({ id, nome, grupo, equip, nivel, tipo, padrao, musculos, passos, dica });
const R = (series, reps, descanso = 45) => ({ series, reps, descanso });
const T = (series, seg, descanso = 30) => ({ series, seg, descanso });

const EXERCICIOS = [
  ex('polichinelo', 'Polichinelo', 'aquecimento', 'nenhum', 1, 'tempo', T(2, 40, 20), 'Corpo todo', [
    'Fique em pé com os pés juntos e os braços ao lado do corpo.',
    'Salte abrindo as pernas e levando os braços acima da cabeça.',
    'Salte de novo voltando à posição inicial.',
    'Mantenha um ritmo constante, aterrissando na ponta dos pés.'], 'Sem impacto: troque o salto por um passo para o lado de cada vez.'),
  ex('corrida-parada', 'Corrida parada', 'aquecimento', 'nenhum', 1, 'tempo', T(2, 40, 20), 'Pernas e coração', [
    'Fique em pé e comece a correr sem sair do lugar.',
    'Movimente os braços junto com as pernas.',
    'Aterrisse com a ponta dos pés e mantenha o tronco reto.'], 'Comece devagar e aumente o ritmo aos poucos.'),
  ex('rotacao-ombros', 'Rotação de ombros', 'aquecimento', 'nenhum', 1, 'tempo', T(1, 30, 10), 'Ombros', [
    'Em pé, braços relaxados ao lado do corpo.',
    'Faça círculos com os ombros para trás, de forma lenta e ampla.',
    'Depois de metade do tempo, inverta para frente.'], 'Movimento suave, sem pressa.'),
  ex('rotacao-quadril', 'Rotação de quadril', 'aquecimento', 'nenhum', 1, 'tempo', T(1, 30, 10), 'Quadril e lombar', [
    'Pés na largura dos ombros e mãos na cintura.',
    'Desenhe círculos grandes com o quadril.',
    'Na metade do tempo, troque o sentido.'], 'Mantenha os joelhos levemente flexionados.'),
  ex('circulo-bracos', 'Círculos com os braços', 'aquecimento', 'nenhum', 1, 'tempo', T(1, 30, 10), 'Ombros', [
    'Abra os braços na altura dos ombros.',
    'Faça círculos pequenos que vão crescendo.',
    'Na metade do tempo, inverta o sentido.'], 'Braços esticados, sem subir os ombros até a orelha.'),
  ex('elevacao-joelhos', 'Elevação de joelhos', 'aquecimento', 'nenhum', 1, 'tempo', T(2, 30, 20), 'Pernas, abdômen e coração', [
    'Em pé, comece a marchar no lugar.',
    'Suba cada joelho até a altura do quadril.',
    'Aumente o ritmo mantendo o tronco reto.'], 'Contraia o abdômen durante todo o movimento.'),
  ex('agachamento-aquec', 'Agachamento lento (aquecimento)', 'aquecimento', 'nenhum', 1, 'reps', R(1, 10, 15), 'Pernas', [
    'Pés na largura dos ombros.',
    'Desça devagar, levando o quadril para trás.',
    'Suba controlando o movimento.'], 'Use como preparação antes do treino de pernas.'),

  ex('along-posterior', 'Alongamento posterior de coxa', 'alongamento', 'nenhum', 1, 'tempo', T(2, 30, 10), 'Posterior da coxa', [
    'Em pé, cruze uma perna na frente da outra ou fique com os pés juntos.',
    'Incline o tronco para frente com as costas retas, levando as mãos em direção aos pés.',
    'Sinta a parte de trás da coxa alongar e segure a posição.'], 'Não force até doer: o alongamento deve ser confortável.'),
  ex('along-quadriceps', 'Alongamento de quadríceps', 'alongamento', 'parede', 1, 'tempo', T(2, 30, 10), 'Frente da coxa', [
    'Em pé, apoie uma mão na parede se precisar.',
    'Dobre um joelho e segure o pé atrás, perto do glúteo.',
    'Mantenha os joelhos alinhados e segure. Depois troque de perna.'], 'Conte o tempo para cada perna.'),
  ex('along-borboleta', 'Borboleta (adutores)', 'alongamento', 'nenhum', 1, 'tempo', T(2, 30, 10), 'Parte interna da coxa', [
    'Sente no chão e junte as solas dos pés.',
    'Segure os pés e deixe os joelhos caírem para os lados.',
    'Coluna reta. Para intensificar, incline levemente o tronco à frente.'], 'Respire fundo e relaxe os joelhos a cada expiração.'),
  ex('along-gato-vaca', 'Gato e vaca', 'alongamento', 'nenhum', 1, 'tempo', T(2, 40, 10), 'Coluna', [
    'Fique de quatro apoios: mãos abaixo dos ombros e joelhos abaixo do quadril.',
    'Ao inspirar, afunde a coluna e olhe para frente (vaca).',
    'Ao expirar, arredonde as costas e leve o queixo ao peito (gato).',
    'Alterne devagar, acompanhando a respiração.'], 'Ótimo para quem passa muito tempo sentado.'),
  ex('along-crianca', 'Postura da criança', 'alongamento', 'nenhum', 1, 'tempo', T(1, 45, 10), 'Costas e quadril', [
    'Ajoelhe e sente sobre os calcanhares.',
    'Leve o tronco à frente e estique os braços no chão.',
    'Relaxe a testa no chão e respire fundo.'], 'Bom para terminar o treino e relaxar.'),
  ex('along-peito-parede', 'Alongamento de peito na parede', 'alongamento', 'parede', 1, 'tempo', T(2, 30, 10), 'Peito e ombro', [
    'Apoie o antebraço na parede, com o cotovelo na altura do ombro.',
    'Gire o corpo levemente para o lado oposto.',
    'Segure e depois troque de lado.'], 'Mantenha o ombro baixo, longe da orelha.'),
  ex('along-triceps', 'Alongamento de tríceps', 'alongamento', 'nenhum', 1, 'tempo', T(2, 25, 10), 'Tríceps e ombro', [
    'Leve um braço acima da cabeça e dobre o cotovelo.',
    'Com a outra mão, puxe o cotovelo suavemente para trás da cabeça.',
    'Segure e troque de braço.'], 'Mantenha o tronco reto.'),
  ex('along-ombro', 'Alongamento de ombro cruzado', 'alongamento', 'nenhum', 1, 'tempo', T(2, 25, 10), 'Ombro e costas', [
    'Cruze um braço esticado na frente do peito.',
    'Com o outro braço, puxe-o para perto do corpo.',
    'Segure e troque de lado.'], 'Não gire o tronco junto.'),
  ex('along-pescoco', 'Alongamento de pescoço', 'alongamento', 'nenhum', 1, 'tempo', T(2, 20, 10), 'Pescoço', [
    'Sentada ou em pé, com a coluna reta.',
    'Incline a cabeça para um lado, levando a orelha em direção ao ombro.',
    'Use a mão para pesar levemente. Segure e troque de lado.'], 'Sem puxar com força.'),
  ex('along-cobra', 'Cobra (abdômen e lombar)', 'alongamento', 'nenhum', 1, 'tempo', T(2, 30, 10), 'Abdômen e lombar', [
    'Deite de barriga para baixo com as mãos ao lado do peito.',
    'Empurre o chão e levante o tronco, deixando o quadril apoiado.',
    'Ombros longe das orelhas. Segure e respire.'], 'Suba só até onde for confortável para a lombar.'),
  ex('along-figura4', 'Alongamento de glúteo (figura 4)', 'alongamento', 'nenhum', 1, 'tempo', T(2, 30, 10), 'Glúteo e quadril', [
    'Deite de costas com os joelhos dobrados.',
    'Cruze um tornozelo sobre o joelho da outra perna.',
    'Puxe a perna de baixo em direção ao peito e segure. Troque de lado.'], 'Mantenha a cabeça e os ombros relaxados no chão.'),
  ex('along-panturrilha', 'Alongamento de panturrilha', 'alongamento', 'parede', 1, 'tempo', T(2, 30, 10), 'Panturrilha', [
    'Apoie as mãos na parede e leve uma perna para trás.',
    'Calcanhar de trás no chão e perna esticada.',
    'Incline o corpo para frente até sentir alongar. Troque de lado.'], 'Pé de trás apontando para frente.'),
  ex('along-lateral', 'Alongamento lateral do tronco', 'alongamento', 'nenhum', 1, 'tempo', T(2, 25, 10), 'Laterais do tronco', [
    'Em pé, pés na largura do quadril.',
    'Leve um braço acima da cabeça e incline o tronco para o lado oposto.',
    'Segure e troque de lado.'], 'Não incline o tronco para frente.'),

  ex('abdominal-supra', 'Abdominal supra (crunch)', 'abdomen', 'nenhum', 1, 'reps', R(3, 15, 40), 'Reto abdominal', [
    'Deite de costas com os joelhos dobrados e os pés no chão.',
    'Mãos atrás da cabeça sem puxar o pescoço, ou cruzadas no peito.',
    'Contraia o abdômen e tire as escápulas do chão.',
    'Desça devagar, sem relaxar totalmente.'], 'Solte o ar ao subir. Olhe para o teto, não para os joelhos.'),
  ex('prancha', 'Prancha', 'abdomen', 'nenhum', 1, 'tempo', T(3, 30, 30), 'Abdômen, lombar e ombros', [
    'Apoie os antebraços no chão, cotovelos abaixo dos ombros.',
    'Estique as pernas e apoie as pontas dos pés.',
    'Corpo em linha reta da cabeça aos calcanhares.',
    'Contraia abdômen e glúteos e segure.'], 'Se o quadril cair, apoie os joelhos no chão.'),
  ex('prancha-lateral', 'Prancha lateral', 'abdomen', 'nenhum', 2, 'tempo', T(2, 25, 20), 'Oblíquos', [
    'Deite de lado e apoie o antebraço, cotovelo abaixo do ombro.',
    'Pernas esticadas, uma sobre a outra.',
    'Levante o quadril formando uma linha reta e segure.',
    'Faça o tempo de um lado e depois do outro.'], 'Versão mais fácil: joelhos dobrados no chão.'),
  ex('abdominal-bicicleta', 'Abdominal bicicleta', 'abdomen', 'nenhum', 2, 'reps', R(3, 20, 40), 'Oblíquos e reto abdominal', [
    'Deite de costas, mãos atrás da cabeça e pernas no ar.',
    'Leve o cotovelo direito em direção ao joelho esquerdo enquanto estica a perna direita.',
    'Alterne os lados num movimento de pedalar.'], 'Conte cada lado como 1 repetição. Movimento controlado.'),
  ex('elevacao-pernas', 'Elevação de pernas', 'abdomen', 'nenhum', 2, 'reps', R(3, 12, 45), 'Abdômen inferior', [
    'Deite de costas com as mãos embaixo do quadril.',
    'Pernas esticadas e juntas.',
    'Suba as pernas até formar 90° com o tronco.',
    'Desça devagar sem encostar os pés no chão.'], 'Se a lombar sair do chão, dobre um pouco os joelhos.'),
  ex('escalador', 'Escalador (mountain climber)', 'abdomen', 'nenhum', 2, 'tempo', T(3, 30, 30), 'Abdômen, ombros e coração', [
    'Fique na posição de prancha com os braços esticados.',
    'Leve um joelho em direção ao peito.',
    'Troque as pernas rapidamente, como se estivesse correndo.'], 'Quadril baixo, na altura dos ombros.'),
  ex('abdominal-remador', 'Abdominal remador', 'abdomen', 'nenhum', 2, 'reps', R(3, 12, 45), 'Reto abdominal', [
    'Sente no chão com as pernas esticadas e os braços à frente.',
    'Incline o tronco para trás e, ao mesmo tempo, dobre os joelhos trazendo-os ao peito.',
    'Estique de novo o corpo sem deitar totalmente.'], 'Mãos podem apoiar no chão para ajudar no começo.'),
  ex('dead-bug', 'Dead bug', 'abdomen', 'nenhum', 1, 'reps', R(3, 10, 40), 'Abdômen profundo', [
    'Deite de costas, braços apontados para o teto e joelhos dobrados a 90° no ar.',
    'Estique um braço para trás e a perna oposta para frente, devagar.',
    'Volte e repita com o outro lado.'], 'A lombar deve ficar colada no chão o tempo todo.'),
  ex('russian-twist', 'Giro russo (russian twist)', 'abdomen', 'nenhum', 2, 'reps', R(3, 20, 40), 'Oblíquos', [
    'Sente com os joelhos dobrados e incline o tronco para trás.',
    'Junte as mãos à frente do peito.',
    'Gire o tronco para um lado e depois para o outro.'], 'Mais difícil: tire os pés do chão ou segure uma garrafa.'),
  ex('abdominal-infra', 'Abdominal infra (joelhos ao peito)', 'abdomen', 'nenhum', 1, 'reps', R(3, 15, 40), 'Abdômen inferior', [
    'Deite de costas, mãos ao lado do corpo.',
    'Joelhos dobrados no ar.',
    'Leve os joelhos em direção ao peito tirando o quadril do chão.',
    'Desça devagar.'], 'Evite dar impulso com as pernas.'),
  ex('prancha-toque-ombro', 'Prancha com toque no ombro', 'abdomen', 'nenhum', 2, 'reps', R(3, 16, 40), 'Abdômen e ombros', [
    'Fique em prancha com os braços esticados e pés afastados.',
    'Tire uma mão do chão e toque o ombro oposto.',
    'Volte e troque de mão, sem balançar o quadril.'], 'Quanto mais afastados os pés, mais fácil equilibrar.'),
  ex('canivete', 'Canivete', 'abdomen', 'nenhum', 3, 'reps', R(3, 10, 50), 'Abdômen completo', [
    'Deite de costas com braços esticados acima da cabeça.',
    'Suba tronco e pernas esticadas ao mesmo tempo, tentando tocar os pés.',
    'Desça devagar controlando.'], 'Exige bastante: se ficar difícil, dobre os joelhos.'),
  ex('hollow', 'Hollow hold (canoa)', 'abdomen', 'nenhum', 3, 'tempo', T(3, 20, 30), 'Abdômen completo', [
    'Deite de costas e estique braços acima da cabeça.',
    'Tire ombros e pernas do chão, formando uma canoa.',
    'Lombar colada no chão. Segure a posição.'], 'Facilite dobrando os joelhos ou subindo mais as pernas.'),

  ex('agachamento', 'Agachamento livre', 'pernas', 'nenhum', 1, 'reps', R(3, 15, 45), 'Quadríceps e glúteos', [
    'Pés na largura dos ombros, pontas levemente para fora.',
    'Leve o quadril para trás e desça como se fosse sentar.',
    'Desça até as coxas ficarem paralelas ao chão, se conseguir.',
    'Empurre o chão com os calcanhares para subir.'], 'Joelhos acompanham a direção dos pés. Peito aberto.'),
  ex('afundo', 'Afundo (avanço)', 'pernas', 'nenhum', 1, 'reps', R(3, 10, 45), 'Quadríceps e glúteos', [
    'Em pé, dê um passo grande à frente.',
    'Desça até os dois joelhos formarem cerca de 90°.',
    'O joelho de trás quase encosta no chão.',
    'Volte e repita. Faça as repetições de cada perna.'], 'Tronco reto e joelho da frente sem passar muito da ponta do pé.'),
  ex('afundo-reverso', 'Afundo reverso', 'pernas', 'nenhum', 1, 'reps', R(3, 10, 45), 'Quadríceps e glúteos', [
    'Em pé, dê um passo grande para trás.',
    'Desça até os joelhos formarem cerca de 90°.',
    'Empurre com a perna da frente para voltar.'], 'Costuma ser mais confortável para os joelhos que o afundo à frente.'),
  ex('agachamento-sumo', 'Agachamento sumô', 'pernas', 'nenhum', 1, 'reps', R(3, 15, 45), 'Adutores, glúteos e quadríceps', [
    'Pés bem afastados, pontas viradas para fora.',
    'Desça com o tronco reto, abrindo os joelhos.',
    'Suba contraindo os glúteos.'], 'Pode segurar uma garrafa ou halter com as duas mãos.'),
  ex('agachamento-bulgaro', 'Agachamento búlgaro', 'pernas', 'cadeira', 2, 'reps', R(3, 10, 60), 'Quadríceps e glúteos', [
    'De costas para uma cadeira, apoie o peito de um pé no assento.',
    'Com a outra perna à frente, desça até o joelho formar 90°.',
    'Suba empurrando com a perna da frente. Depois troque.'], 'Afaste o suficiente da cadeira para o joelho não passar muito do pé.'),
  ex('cadeirinha', 'Cadeirinha na parede', 'pernas', 'parede', 1, 'tempo', T(3, 30, 40), 'Quadríceps', [
    'Encoste as costas na parede.',
    'Desça até os joelhos formarem 90°, como se estivesse sentada.',
    'Segure a posição com os braços soltos ou cruzados.'], 'Joelhos alinhados com os tornozelos.'),
  ex('panturrilha', 'Elevação de panturrilha', 'pernas', 'nenhum', 1, 'reps', R(3, 20, 30), 'Panturrilha', [
    'Em pé, apoie as mãos na parede para equilíbrio.',
    'Suba na ponta dos pés o mais alto que conseguir.',
    'Desça devagar.'], 'Mais difícil: faça com uma perna de cada vez ou num degrau.'),
  ex('agachamento-salto', 'Agachamento com salto', 'pernas', 'nenhum', 2, 'reps', R(3, 12, 60), 'Pernas e coração', [
    'Faça um agachamento normal.',
    'Suba com força e salte.',
    'Aterrisse suave, já descendo para o próximo agachamento.'], 'Tem impacto: faça num piso que amorteça.'),
  ex('step-up', 'Subida na cadeira (step-up)', 'pernas', 'cadeira', 2, 'reps', R(3, 10, 45), 'Quadríceps e glúteos', [
    'De frente para uma cadeira firme ou degrau.',
    'Suba com uma perna, empurrando com o calcanhar.',
    'Desça controlando. Faça as repetições de cada lado.'], 'Use um apoio que não escorregue.'),
  ex('afundo-lateral', 'Afundo lateral', 'pernas', 'nenhum', 2, 'reps', R(3, 10, 45), 'Adutores, quadríceps e glúteos', [
    'Pés juntos. Dê um passo grande para o lado.',
    'Dobre o joelho dessa perna e mantenha a outra esticada.',
    'Volte ao centro e troque de lado.'], 'Quadril vai para trás, como num agachamento.'),
  ex('agachamento-isometrico', 'Agachamento isométrico', 'pernas', 'nenhum', 2, 'tempo', T(3, 30, 40), 'Quadríceps e glúteos', [
    'Desça até a posição de agachamento.',
    'Segure lá embaixo, sem apoiar em nada.',
    'Peito aberto e peso nos calcanhares.'], 'Respire normalmente durante o tempo.'),
  ex('agachamento-halter', 'Agachamento com halter (goblet)', 'pernas', 'halter', 2, 'reps', R(3, 12, 60), 'Quadríceps e glúteos', [
    'Segure um halter ou garrafa junto ao peito com as duas mãos.',
    'Agache levando o quadril para trás.',
    'Suba mantendo o peso perto do corpo.'], 'O peso na frente ajuda a manter o tronco reto.'),
  ex('stiff', 'Stiff com halter', 'pernas', 'halter', 2, 'reps', R(3, 12, 60), 'Posterior da coxa e glúteos', [
    'Em pé, segure halteres ou garrafas à frente das coxas.',
    'Joelhos levemente dobrados.',
    'Incline o tronco à frente levando o quadril para trás, com as costas retas.',
    'Suba contraindo glúteos e posterior.'], 'Os pesos descem rente às pernas. Não arredonde as costas.'),

  ex('ponte', 'Ponte de glúteo', 'gluteos', 'nenhum', 1, 'reps', R(3, 15, 40), 'Glúteos e posterior', [
    'Deite de costas com joelhos dobrados e pés no chão.',
    'Braços ao lado do corpo.',
    'Empurre com os calcanhares e suba o quadril.',
    'Contraia os glúteos lá em cima e desça devagar.'], 'Não arqueie a lombar: quem trabalha é o glúteo.'),
  ex('ponte-unilateral', 'Ponte unilateral', 'gluteos', 'nenhum', 2, 'reps', R(3, 10, 45), 'Glúteos', [
    'Na posição de ponte, estique uma perna para cima.',
    'Suba o quadril usando só a perna apoiada.',
    'Faça as repetições e troque de lado.'], 'Mantenha o quadril alinhado, sem cair para um lado.'),
  ex('coice', 'Coice de glúteo (quatro apoios)', 'gluteos', 'nenhum', 1, 'reps', R(3, 15, 40), 'Glúteos', [
    'Fique de quatro apoios.',
    'Leve uma perna para trás e para cima, com o joelho dobrado ou esticado.',
    'Contraia o glúteo no alto e volte. Depois troque de perna.'], 'Não arqueie as costas para subir mais.'),
  ex('abducao-deitada', 'Abdução de quadril deitada', 'gluteos', 'nenhum', 1, 'reps', R(3, 15, 40), 'Glúteo médio', [
    'Deite de lado com as pernas esticadas.',
    'Levante a perna de cima, sem girar o pé para cima.',
    'Desça devagar. Faça as repetições e troque de lado.'], 'Mais difícil: use um elástico acima dos joelhos.'),
  ex('concha', 'Concha (clamshell)', 'gluteos', 'nenhum', 1, 'reps', R(3, 15, 30), 'Glúteo médio', [
    'Deite de lado com os joelhos dobrados e pés juntos.',
    'Abra o joelho de cima sem separar os pés.',
    'Feche devagar. Depois troque de lado.'], 'O quadril não deve girar para trás.'),
  ex('fire-hydrant', 'Hidrante (fire hydrant)', 'gluteos', 'nenhum', 1, 'reps', R(3, 12, 30), 'Glúteo médio', [
    'De quatro apoios.',
    'Levante uma perna para o lado com o joelho dobrado.',
    'Desça e repita. Depois troque de lado.'], 'Mantenha os braços esticados e o tronco parado.'),
  ex('passada-elastico', 'Caminhada lateral com elástico', 'gluteos', 'elastico', 2, 'reps', R(3, 12, 40), 'Glúteo médio', [
    'Coloque o elástico acima dos joelhos ou nos tornozelos.',
    'Semiagache e dê passos para o lado mantendo a tensão.',
    'Faça as repetições para um lado e volte.'], 'Os pés nunca se juntam totalmente.'),
  ex('elevacao-quadril-cadeira', 'Elevação de quadril com pés na cadeira', 'gluteos', 'cadeira', 2, 'reps', R(3, 12, 45), 'Glúteos e posterior', [
    'Deite de costas e apoie os calcanhares no assento de uma cadeira.',
    'Suba o quadril contraindo os glúteos.',
    'Desça devagar.'], 'Ótimo para o posterior da coxa também.'),

  ex('flexao', 'Flexão de braço', 'peito', 'nenhum', 2, 'reps', R(3, 10, 60), 'Peito, tríceps e ombros', [
    'Mãos no chão um pouco mais abertas que os ombros.',
    'Corpo em linha reta, apoiado nas pontas dos pés.',
    'Desça o peito em direção ao chão dobrando os cotovelos.',
    'Empurre o chão para subir.'], 'Comece com os joelhos apoiados ou com as mãos numa mesa.'),
  ex('flexao-joelhos', 'Flexão com joelhos apoiados', 'peito', 'nenhum', 1, 'reps', R(3, 12, 45), 'Peito, tríceps e ombros', [
    'Mãos no chão um pouco mais abertas que os ombros.',
    'Apoie os joelhos e cruze os pés no ar.',
    'Desça o peito mantendo o corpo reto dos joelhos à cabeça.',
    'Empurre para subir.'], 'O passo antes da flexão completa.'),
  ex('flexao-inclinada', 'Flexão inclinada (mãos na cadeira)', 'peito', 'cadeira', 1, 'reps', R(3, 12, 45), 'Peito e tríceps', [
    'Apoie as mãos no assento de uma cadeira firme ou mesa.',
    'Pés para trás, corpo reto.',
    'Desça o peito até a beirada e empurre de volta.'], 'Quanto mais alto o apoio, mais fácil.'),
  ex('flexao-diamante', 'Flexão diamante', 'peito', 'nenhum', 3, 'reps', R(3, 8, 60), 'Tríceps e peito', [
    'Junte as mãos embaixo do peito formando um losango com os dedos.',
    'Corpo reto. Desça mantendo os cotovelos perto do corpo.',
    'Suba empurrando.'], 'Pode fazer com os joelhos apoiados.'),
  ex('flexao-declinada', 'Flexão declinada (pés na cadeira)', 'peito', 'cadeira', 3, 'reps', R(3, 8, 60), 'Peito superior e ombros', [
    'Pés apoiados no assento de uma cadeira, mãos no chão.',
    'Corpo reto. Desça o peito até perto do chão.',
    'Suba empurrando.'], 'Mais difícil que a flexão normal.'),
  ex('crucifixo-chao', 'Crucifixo no chão com halteres', 'peito', 'halter', 2, 'reps', R(3, 12, 45), 'Peito', [
    'Deite de costas segurando halteres ou garrafas acima do peito.',
    'Abra os braços para os lados com os cotovelos levemente dobrados.',
    'Desça até os cotovelos tocarem o chão e volte juntando os pesos.'], 'O chão limita o movimento e protege o ombro.'),
  ex('supino-chao', 'Supino no chão com halteres', 'peito', 'halter', 1, 'reps', R(3, 12, 45), 'Peito e tríceps', [
    'Deite de costas com halteres ou garrafas na altura do peito.',
    'Empurre os pesos para cima até esticar os braços.',
    'Desça até os cotovelos encostarem no chão.'], 'Cotovelos a uns 45° do corpo.'),

  ex('superman', 'Superman', 'costas', 'nenhum', 1, 'reps', R(3, 12, 40), 'Lombar e costas', [
    'Deite de barriga para baixo com braços esticados à frente.',
    'Levante braços, peito e pernas ao mesmo tempo.',
    'Segure 2 segundos lá em cima e desça.'], 'Olhe para o chão para não forçar o pescoço.'),
  ex('remada-toalha', 'Remada com toalha na porta', 'costas', 'toalha', 2, 'reps', R(3, 12, 45), 'Costas e bíceps', [
    'Passe uma toalha em volta da maçaneta de uma porta bem fechada (lado da dobradiça para longe de você).',
    'Segure as pontas e incline o corpo para trás com os braços esticados.',
    'Puxe o corpo em direção à porta juntando as escápulas.'], 'Teste se a porta está firme antes. Quanto mais inclinada, mais difícil.'),
  ex('remada-halter', 'Remada curvada com halter', 'costas', 'halter', 1, 'reps', R(3, 12, 45), 'Costas e bíceps', [
    'Segure halteres ou garrafas e incline o tronco à frente com as costas retas.',
    'Joelhos levemente dobrados, braços esticados.',
    'Puxe os pesos em direção ao umbigo, levando os cotovelos para trás.',
    'Desça devagar.'], 'Aperte as escápulas no fim do movimento.'),
  ex('remada-unilateral', 'Remada unilateral apoiada na cadeira', 'costas', 'halter', 1, 'reps', R(3, 12, 45), 'Costas e bíceps', [
    'Apoie uma mão e um joelho numa cadeira, costas retas.',
    'Com a outra mão, segure o peso com o braço esticado.',
    'Puxe o cotovelo para trás e para cima. Troque de lado.'], 'Não gire o tronco para puxar.'),
  ex('remada-elastico', 'Remada com elástico', 'costas', 'elastico', 1, 'reps', R(3, 15, 40), 'Costas', [
    'Sente com as pernas esticadas e passe o elástico nos pés.',
    'Segure as pontas com os braços esticados.',
    'Puxe levando os cotovelos para trás e juntando as escápulas.'], 'Tronco reto, sem jogar o corpo para trás.'),
  ex('nadador', 'Nadador (Y-T-W no chão)', 'costas', 'nenhum', 1, 'reps', R(3, 10, 40), 'Parte alta das costas', [
    'Deite de barriga para baixo.',
    'Levante um pouco os braços e desenhe as letras Y, T e W com eles.',
    'Cada sequência completa conta como 1.'], 'Ótimo para postura de quem fica no computador.'),
  ex('bom-dia', 'Bom dia (good morning)', 'costas', 'nenhum', 1, 'reps', R(3, 12, 40), 'Lombar e posterior', [
    'Em pé, mãos atrás da cabeça e joelhos levemente dobrados.',
    'Incline o tronco à frente levando o quadril para trás, costas retas.',
    'Volte contraindo glúteos.'], 'Desça só até onde mantiver a coluna reta.'),
  ex('pullover-halter', 'Pullover com halter', 'costas', 'halter', 2, 'reps', R(3, 12, 45), 'Costas e peito', [
    'Deite no chão segurando um halter com as duas mãos acima do peito.',
    'Leve o peso para trás da cabeça com os braços quase esticados.',
    'Volte à posição inicial.'], 'Movimento lento e controlado.'),

  ex('desenvolvimento', 'Desenvolvimento com halteres', 'ombros', 'halter', 1, 'reps', R(3, 12, 45), 'Ombros e tríceps', [
    'Sentada ou em pé, segure halteres ou garrafas na altura dos ombros.',
    'Empurre os pesos para cima até esticar os braços.',
    'Desça até a altura das orelhas.'], 'Abdômen contraído para não arquear as costas.'),
  ex('elevacao-lateral', 'Elevação lateral', 'ombros', 'halter', 1, 'reps', R(3, 12, 40), 'Ombro lateral', [
    'Em pé, halteres ou garrafas ao lado do corpo.',
    'Levante os braços para os lados até a altura dos ombros.',
    'Desça devagar.'], 'Cotovelos levemente dobrados. Use pouco peso.'),
  ex('elevacao-frontal', 'Elevação frontal', 'ombros', 'halter', 1, 'reps', R(3, 12, 40), 'Ombro frontal', [
    'Em pé, pesos à frente das coxas.',
    'Levante os braços à frente até a altura dos ombros.',
    'Desça devagar.'], 'Sem balançar o corpo.'),
  ex('flexao-pike', 'Flexão pike', 'ombros', 'nenhum', 3, 'reps', R(3, 8, 60), 'Ombros e tríceps', [
    'Mãos e pés no chão, quadril alto formando um V invertido.',
    'Dobre os cotovelos levando a cabeça em direção ao chão entre as mãos.',
    'Empurre de volta.'], 'Quanto mais perto pés e mãos, mais trabalha o ombro.'),
  ex('crucifixo-inverso', 'Crucifixo inverso', 'ombros', 'halter', 1, 'reps', R(3, 12, 40), 'Ombro posterior e costas', [
    'Incline o tronco à frente com as costas retas, pesos pendurados.',
    'Abra os braços para os lados até a altura dos ombros.',
    'Desça devagar.'], 'Aperte as escápulas no alto.'),
  ex('circulos-isometricos', 'Braços abertos em círculos', 'ombros', 'nenhum', 1, 'tempo', T(3, 30, 20), 'Ombros', [
    'Braços abertos e esticados na altura dos ombros.',
    'Faça círculos pequenos e rápidos.',
    'Na metade do tempo, inverta o sentido.'], 'Arde rápido: é normal!'),
  ex('elevacao-lateral-elastico', 'Elevação lateral com elástico', 'ombros', 'elastico', 1, 'reps', R(3, 15, 40), 'Ombro lateral', [
    'Pise no meio do elástico e segure as pontas.',
    'Levante os braços para os lados até a altura dos ombros.',
    'Desça devagar mantendo a tensão.'], 'Cotovelos levemente dobrados.'),

  ex('rosca-direta', 'Rosca direta', 'bracos', 'halter', 1, 'reps', R(3, 12, 40), 'Bíceps', [
    'Em pé, halteres ou garrafas ao lado do corpo com as palmas para frente.',
    'Dobre os cotovelos subindo os pesos até os ombros.',
    'Desça devagar sem balançar.'], 'Cotovelos colados ao corpo.'),
  ex('rosca-martelo', 'Rosca martelo', 'bracos', 'halter', 1, 'reps', R(3, 12, 40), 'Bíceps e antebraço', [
    'Segure os pesos com as palmas viradas uma para a outra.',
    'Suba dobrando os cotovelos.',
    'Desça devagar.'], 'Pode alternar os braços.'),
  ex('triceps-banco', 'Tríceps no banco (mergulho)', 'bracos', 'cadeira', 1, 'reps', R(3, 12, 45), 'Tríceps', [
    'Sente na beira de uma cadeira firme e apoie as mãos ao lado do quadril.',
    'Tire o quadril da cadeira, pernas dobradas à frente.',
    'Dobre os cotovelos descendo o corpo e empurre para subir.'], 'Cotovelos apontam para trás. Pernas esticadas deixa mais difícil.'),
  ex('triceps-frances', 'Tríceps francês', 'bracos', 'halter', 1, 'reps', R(3, 12, 40), 'Tríceps', [
    'Segure um halter ou garrafa com as duas mãos acima da cabeça.',
    'Dobre os cotovelos levando o peso atrás da cabeça.',
    'Estique os braços de volta.'], 'Cotovelos apontando para cima, perto da cabeça.'),
  ex('rosca-mochila', 'Rosca com mochila', 'bracos', 'mochila', 1, 'reps', R(3, 12, 40), 'Bíceps', [
    'Coloque livros ou garrafas numa mochila e segure pela alça de cima.',
    'Dobre o cotovelo subindo a mochila.',
    'Desça devagar. Troque de braço.'], 'Ajuste o peso com mais ou menos itens.'),
  ex('rosca-elastico', 'Rosca com elástico', 'bracos', 'elastico', 1, 'reps', R(3, 15, 40), 'Bíceps', [
    'Pise no meio do elástico e segure as pontas.',
    'Dobre os cotovelos puxando até os ombros.',
    'Desça devagar.'], 'Cotovelos parados ao lado do corpo.'),
  ex('triceps-coice', 'Tríceps coice', 'bracos', 'halter', 1, 'reps', R(3, 12, 40), 'Tríceps', [
    'Incline o tronco à frente segurando os pesos, cotovelos dobrados ao lado do corpo.',
    'Estique os braços para trás.',
    'Volte devagar.'], 'Só o antebraço se mexe.'),
  ex('prancha-flexao', 'Prancha sobe e desce', 'bracos', 'nenhum', 2, 'reps', R(3, 10, 45), 'Tríceps, ombros e abdômen', [
    'Comece em prancha nos antebraços.',
    'Estique um braço de cada vez até ficar em prancha alta.',
    'Volte para os antebraços, um de cada vez.'], 'Alterne o braço que começa.'),

  ex('burpee', 'Burpee', 'cardio', 'nenhum', 3, 'reps', R(3, 10, 60), 'Corpo todo', [
    'Em pé, agache e apoie as mãos no chão.',
    'Jogue os pés para trás ficando em prancha.',
    'Traga os pés de volta e salte com os braços para cima.'], 'Versão mais leve: sem flexão e sem salto, dando passos para trás.'),
  ex('skipping', 'Skipping alto', 'cardio', 'nenhum', 2, 'tempo', T(3, 30, 30), 'Pernas e coração', [
    'Corra no lugar subindo bem os joelhos.',
    'Movimente os braços rápido.',
    'Aterrisse na ponta dos pés.'], 'Mantenha o ritmo até o fim do tempo.'),
  ex('polichinelo-cruzado', 'Polichinelo cruzado', 'cardio', 'nenhum', 1, 'tempo', T(3, 30, 30), 'Corpo todo', [
    'Como um polichinelo, mas ao fechar cruze as pernas e os braços.',
    'Alterne qual perna fica na frente.'], 'Bom para variar o polichinelo normal.'),
  ex('salto-estrela', 'Salto estrela', 'cardio', 'nenhum', 2, 'reps', R(3, 10, 45), 'Pernas e coração', [
    'Agache um pouco.',
    'Salte abrindo braços e pernas no ar, formando uma estrela.',
    'Aterrisse com os pés juntos e joelhos levemente dobrados.'], 'Tem impacto: use um tênis com amortecimento.'),
  ex('chute-frontal', 'Chutes frontais alternados', 'cardio', 'nenhum', 1, 'tempo', T(3, 30, 30), 'Pernas, abdômen e coração', [
    'Em pé, base firme e braços em guarda.',
    'Chute à frente com uma perna e volte.',
    'Alterne as pernas num ritmo constante.'], 'Contraia o abdômen a cada chute.'),
  ex('soco-sombra', 'Socos no ar (shadow boxing)', 'cardio', 'nenhum', 1, 'tempo', T(3, 40, 30), 'Braços, ombros e coração', [
    'Pés afastados, um à frente do outro, joelhos levemente dobrados.',
    'Soque o ar alternando os braços, girando levemente o tronco.',
    'Mantenha as mãos protegendo o rosto entre os socos.'], 'Pode segurar garrafinhas para mais intensidade.'),
  ex('patinador', 'Patinador', 'cardio', 'nenhum', 2, 'tempo', T(3, 30, 30), 'Pernas, glúteos e coração', [
    'Salte para o lado aterrissando numa perna só.',
    'A outra perna cruza atrás.',
    'Salte para o outro lado, como um patinador.'], 'Sem salto: dê passos largos para os lados.'),
  ex('pular-corda', 'Pular corda (com ou sem corda)', 'cardio', 'nenhum', 2, 'tempo', T(3, 45, 30), 'Pernas e coração', [
    'Pule na ponta dos pés com saltos baixos.',
    'Gire a corda com os punhos, cotovelos perto do corpo.',
    'Sem corda: faça o mesmo movimento imitando.'], 'Saltos pequenos cansam menos e protegem os joelhos.'),
];

const exercicioPorId = (id) => EXERCICIOS.find((e) => e.id === id) || (estado.treino?.meus || []).find((e) => e.id === id);
const todosExercicios = () => [...EXERCICIOS, ...(estado.treino?.meus || [])];
