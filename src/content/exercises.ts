import type { Equipment, LevelId } from '../domain/types'

/**
 * Catálogo de ejercicios. Es el activo real de la app: lo que ninguna otra
 * tiene es que cada bloque explique el montaje, la ejecución, el error típico
 * y qué deberías notar.
 *
 * Los dos idiomas viven en el mismo objeto a propósito, para que no se puedan
 * desincronizar sin que salte a la vista.
 */

export type ExerciseTag =
  | 'calentamiento'
  | 'calma'
  | 'tecnica'
  | 'brazos'
  | 'piernas'
  | 'cadera'
  | 'continuo'
  | 'intervalos'
  | 'test'
  | 'seco'

export interface ExerciseText {
  name: string
  /** Párrafos. Se renderizan en orden. */
  detail: string[]
  /** Consulta con la que se abre la búsqueda de YouTube. */
  query: string
}

export interface Exercise {
  id: string
  /** Material imprescindible. null = no necesita nada. */
  equipment: Equipment | null
  tags: ExerciseTag[]
  minLevel: LevelId
  /** Se mide en tiempo en lugar de en metros. */
  timeBased?: boolean
  /**
   * Nunca se le añade volumen para que el bloque vuelva a la pared de
   * salida (ver `fitToWall` en generator.ts). Para estilos exigentes de
   * hombro o de fatiga, es preferible que el bloque ocasionalmente acabe
   * en el lado contrario a que gane una repetición o un largo de propina.
   */
  neverAmplify?: boolean
  es: ExerciseText
  en: ExerciseText
}

const E = (x: Exercise): Exercise => x

export const EXERCISES: Exercise[] = [
  // ------------------------------------------------------------ estructura
  E({
    id: 'calentamiento',
    equipment: null,
    tags: ['calentamiento'],
    minLevel: 'inicio',
    es: {
      name: 'Calentamiento',
      query: 'calentamiento natacion crol espalda tecnica',
      detail: [
        'Suelto, alternando 50 de crol y 50 de espalda. No busques ritmo: el objetivo es subir la temperatura, soltar el hombro y empezar a respirar largo.',
        'Si llegas al final del calentamiento con las pulsaciones altas, has ido demasiado fuerte y la sesión se te va a hacer cuesta arriba.',
      ],
    },
    en: {
      name: 'Warm-up',
      query: 'swimming warm up freestyle backstroke drill',
      detail: [
        'Easy, alternating 50 free and 50 back. Don’t chase a pace: the point is to warm up, loosen the shoulder and settle into long breathing.',
        'If you finish the warm-up with your heart rate already high, you went too hard and the rest of the session will suffer.',
      ],
    },
  }),
  E({
    id: 'calma',
    equipment: null,
    tags: ['calma'],
    minLevel: 'inicio',
    es: {
      name: 'Vuelta a la calma',
      query: 'vuelta a la calma natacion espalda suave',
      detail: [
        'Muy suave, sin buscar velocidad. Baja pulsaciones y descarga el hombro.',
        'Espalda es mejor que crol aquí: abre el pecho después de toda la sesión cerrándolo.',
      ],
    },
    en: {
      name: 'Cool-down',
      query: 'swimming cool down easy backstroke',
      detail: [
        'Very easy, no speed. It brings your heart rate down and unloads the shoulder.',
        'Backstroke beats freestyle here: it opens the chest after a whole session of closing it.',
      ],
    },
  }),

  // ------------------------------------------------------------ técnica
  E({
    id: 'deslizamiento',
    equipment: 'aletas',
    tags: ['tecnica'],
    minLevel: 'inicio',
    es: {
      name: 'Deslizamiento',
      query: 'ejercicio deslizamiento natacion crol tecnica',
      detail: [
        'Montaje. Con aletas, de frente, brazos estirados delante, una mano sobre la otra, mirada al fondo de la piscina.',
        'Ejecución. Das una brazada completa y te quedas totalmente estirado contando hasta dos antes de empezar la siguiente. El cuerpo tiene que quedar largo, como si tiraran de ti desde las manos.',
        'Error típico. Encadenar brazadas por ansiedad. Si no cuentas los dos segundos, el ejercicio no existe.',
        'Qué debes notar. Que avanzas durante la pausa. Si te hundes o te paras en seco, tu posición no es horizontal.',
      ],
    },
    en: {
      name: 'Glide drill',
      query: 'freestyle glide drill swimming technique',
      detail: [
        'Set-up. With fins, face down, arms stretched in front, one hand over the other, eyes on the bottom of the pool.',
        'Execution. Take one full stroke and hold the stretch for a count of two before the next one. The body should stay long, as if someone were pulling you by the hands.',
        'Common mistake. Rushing strokes out of nerves. Without the two-second count the drill does not exist.',
        'What you should feel. That you keep moving during the pause. If you sink or stall, your body position is not horizontal.',
      ],
    },
  }),
  E({
    id: 'seis-seis',
    equipment: 'aletas',
    tags: ['tecnica', 'cadera'],
    minLevel: 'inicio',
    es: {
      name: '6 brazadas + 6 patadas',
      query: 'ejercicio 6 brazadas 6 patadas costado natacion',
      detail: [
        'Montaje. Con aletas. Empiezas nadando crol normal.',
        'Ejecución. Seis brazadas de crol y a la sexta te quedas de costado: brazo de abajo estirado hacia delante, brazo de arriba pegado al muslo, mirada al fondo, pataleando seis veces. Luego seis brazadas más y cambias de lado.',
        'Error típico. Quedarse de costado con el hombro de arriba caído hacia atrás. El cuerpo gira, el cuello no.',
        'Qué debes notar. Que la posición de costado es cómoda y avanzas. Es la posición sobre la que se construye toda la brazada de crol.',
      ],
    },
    en: {
      name: '6 strokes + 6 kicks',
      query: 'six kick switch drill freestyle swimming',
      detail: [
        'Set-up. With fins, starting from normal freestyle.',
        'Execution. Six freestyle strokes, then hold on your side: lower arm extended forward, upper arm along the thigh, eyes down, kicking six times. Six more strokes and switch sides.',
        'Common mistake. Rolling onto your side with the top shoulder falling backwards. The body rotates, the neck does not.',
        'What you should feel. That the side position is comfortable and you keep moving. Everything in freestyle is built on it.',
      ],
    },
  }),
  E({
    id: 'bilateral',
    equipment: null,
    tags: ['tecnica'],
    minLevel: 'inicio',
    es: {
      name: 'Respiración bilateral',
      query: 'respiracion bilateral crol cada 3 brazadas tecnica',
      detail: [
        'Montaje. Sin material, crol normal.',
        'Ejecución. Respiras cada tres brazadas, alternando lado. La clave está debajo del agua: suelta todo el aire por nariz y boca de forma continua mientras la cara está sumergida, para que al girar solo tengas que coger.',
        'Error típico. Aguantar el aire y luego soltar y coger en el mismo medio segundo. Es la causa número uno de la sensación de ahogo nadando.',
        'Qué debes notar. Calma. Si cada tres brazadas te agobia, baja el ritmo antes que volver a respirar cada dos.',
      ],
    },
    en: {
      name: 'Bilateral breathing',
      query: 'bilateral breathing freestyle every 3 strokes drill',
      detail: [
        'Set-up. No equipment, normal freestyle.',
        'Execution. Breathe every three strokes, alternating sides. The key happens underwater: let all the air out through nose and mouth continuously while your face is submerged, so that turning only means taking air in.',
        'Common mistake. Holding your breath and then exhaling and inhaling in the same half second. It is the number one reason people feel like they are drowning.',
        'What you should feel. Calm. If every third stroke feels like too much, slow down rather than going back to every second.',
      ],
    },
  }),

  // ------------------------------------------------------------ brazos
  E({
    id: 'pull-brazos',
    equipment: 'pull',
    tags: ['brazos'],
    minLevel: 'inicio',
    es: {
      name: 'Solo brazos',
      query: 'ejercicio pull buoy natacion tecnica brazada',
      detail: [
        'Montaje. Pull-buoy entre los muslos, justo por encima de las rodillas. Las piernas no hacen nada: van juntas y quietas.',
        'Ejecución. Mete la mano lejos, delante de la cabeza, y busca agarrar agua con el antebrazo manteniendo el codo alto. Tira hasta la cadera.',
        'Error típico. Entrar con la mano cerca de la cabeza y empujar hacia abajo, lo que te levanta en vez de moverte hacia delante.',
        'Qué debes notar. Carga en dorsal y hombro. Es el bloque que más trabaja el tren superior de toda la sesión.',
      ],
    },
    en: {
      name: 'Arms only',
      query: 'pull buoy swimming drill catch technique',
      detail: [
        'Set-up. Pull buoy between the thighs, just above the knees. The legs do nothing: together and still.',
        'Execution. Enter the hand far in front of your head and catch water with the forearm, keeping the elbow high. Pull through to the hip.',
        'Common mistake. Entering close to the head and pushing down, which lifts you instead of moving you forward.',
        'What you should feel. Load in the lats and shoulders. It is the block that works the upper body hardest.',
      ],
    },
  }),
  E({
    id: 'palas-brazos',
    equipment: 'palas',
    tags: ['brazos'],
    minLevel: 'medio',
    es: {
      name: 'Brazos con palas',
      query: 'entrenamiento con palas natacion tecnica hombro',
      detail: [
        'Montaje. Palas pequeñas y pull-buoy si lo tienes. Series cortas: las palas cansan el hombro mucho antes de lo que parece.',
        'Ejecución. La pala no es para tirar más fuerte, es para notar dónde estás perdiendo agua. Si la mano entra torcida, la pala te lo dice enseguida.',
        'Aviso. Si notas cualquier molestia en el hombro, quítatelas ese mismo día. No se negocia.',
        'Qué debes notar. Más agarre y más resistencia. En cuanto la técnica se descompone, para el bloque.',
      ],
    },
    en: {
      name: 'Paddle pull',
      query: 'swimming paddles training technique shoulder',
      detail: [
        'Set-up. Small paddles, plus a pull buoy if you have one. Short sets: paddles tire the shoulder far sooner than you expect.',
        'Execution. Paddles are not for pulling harder, they are for noticing where you are losing water. A crooked entry becomes obvious immediately.',
        'Warning. Any shoulder discomfort and they come off that same day. Not negotiable.',
        'What you should feel. More grip and more resistance. The moment technique falls apart, end the block.',
      ],
    },
  }),

  // ------------------------------------------------------------ piernas y cadera
  E({
    id: 'patada-costado',
    equipment: 'aletas',
    tags: ['piernas', 'cadera', 'tecnica'],
    minLevel: 'inicio',
    es: {
      name: 'Patada de costado',
      query: 'patada de costado natacion ejercicio tecnica',
      detail: [
        'Montaje. Con aletas, de lado. Brazo de abajo estirado hacia delante, brazo de arriba pegado al muslo, oreja apoyada en el brazo, mirada al fondo.',
        'Ejecución. Patada continua desde la cadera, rodilla casi recta y tobillo suelto. Respiras girando la cara hacia arriba sin sacar el hombro del agua. Cambias de lado cada largo.',
        'Error típico. Patear desde la rodilla, como si dieras patadas a un balón. La patada nace de la cadera.',
        'Qué debes notar. El costado y el glúteo trabajando. Es el ejercicio con más retorno de todo el plan.',
      ],
    },
    en: {
      name: 'Side kick',
      query: 'side kicking drill swimming technique fins',
      detail: [
        'Set-up. On your side with fins. Lower arm extended forward, upper arm along the thigh, ear resting on the arm, eyes down.',
        'Execution. Continuous kick from the hip, knee almost straight, ankle loose. Breathe by turning your face up without lifting the shoulder out. Switch sides every length.',
        'Common mistake. Kicking from the knee, like kicking a ball. The kick starts at the hip.',
        'What you should feel. The side of your body and your glute working. It is the highest-return drill in the plan.',
      ],
    },
  }),
  E({
    id: 'patada-tabla',
    equipment: 'tabla',
    tags: ['piernas'],
    minLevel: 'inicio',
    es: {
      name: 'Patada con tabla',
      query: 'patada con tabla natacion tecnica piernas',
      detail: [
        'Montaje. Tabla sujeta por el borde más lejano, brazos estirados, cabeza dentro del agua salvo para respirar.',
        'Ejecución. Patada desde la cadera, rodilla casi recta, tobillo suelto. Los pies apenas asoman: si salen mucho, estás pedaleando.',
        'Error típico. Nadar con la cabeza fuera todo el rato. Hunde la cadera, arquea la lumbar y convierte el ejercicio en otra cosa.',
        'Contexto honesto. En crol de fondo las piernas aportan poca propulsión; su papel es sostener la posición. No abuses de este bloque.',
      ],
    },
    en: {
      name: 'Kickboard kick',
      query: 'kickboard kicking drill swimming technique',
      detail: [
        'Set-up. Hold the far edge of the board, arms extended, head in the water except to breathe.',
        'Execution. Kick from the hip, knee almost straight, ankle loose. The feet barely break the surface; if they come right out, you are cycling.',
        'Common mistake. Swimming with the head up the whole time. It drops the hips, arches the lower back and turns the drill into something else.',
        'Honest context. In distance freestyle the legs add little propulsion; their job is holding position. Don’t overdo this block.',
      ],
    },
  }),
  E({
    id: 'ondulacion',
    equipment: 'aletas',
    tags: ['cadera', 'piernas'],
    minLevel: 'basico',
    neverAmplify: true,
    es: {
      name: 'Ondulación',
      query: 'ondulacion delfin natacion ejercicio tecnica',
      detail: [
        'Montaje. Con aletas, boca abajo, brazos estirados delante y cabeza entre los brazos.',
        'Ejecución. Ondulación continua: el movimiento nace del abdomen y la cadera y recorre el cuerpo hasta la aleta, como un látigo. Las rodillas se doblan poco y de forma pasiva.',
        'Error típico. Doblar mucho la rodilla y mover solo las piernas. Si el pecho no sube y baja un poco, no estás ondulando.',
        'Qué debes notar. Abdomen bajo, glúteo e isquiotibiales. Es lo más parecido a un ejercicio de cadera que existe dentro del agua.',
      ],
    },
    en: {
      name: 'Body undulation',
      query: 'dolphin kick body undulation swimming drill',
      detail: [
        'Set-up. Face down with fins, arms extended in front, head between the arms.',
        'Execution. Continuous undulation: the movement starts in the abdomen and hips and travels down to the fin like a whip. The knees bend little, and passively.',
        'Common mistake. Bending the knees a lot and moving only the legs. If your chest does not rise and fall a little, you are not undulating.',
        'What you should feel. Lower abs, glutes and hamstrings. It is the closest thing to hip training that exists in the water.',
      ],
    },
  }),
  E({
    id: 'patada-espalda',
    equipment: 'aletas',
    tags: ['piernas', 'cadera'],
    minLevel: 'basico',
    es: {
      name: 'Patada de espalda',
      query: 'patada de espalda natacion tecnica ejercicio',
      detail: [
        'Montaje. Con aletas, boca arriba, brazos estirados por encima de la cabeza o pegados al cuerpo. Cadera alta, cerca de la superficie.',
        'Ejecución. Patada continua desde la cadera. Las rodillas no deben salir del agua: si salen, estás pedaleando.',
        'Error típico. Sentarse, con la cadera hundida y las rodillas fuera. Mete el ombligo y saca el pecho.',
        'Qué debes notar. Es la posición que más carga la extensión de cadera, es decir, el glúteo.',
      ],
    },
    en: {
      name: 'Backstroke kick',
      query: 'backstroke kicking drill swimming technique',
      detail: [
        'Set-up. On your back with fins, arms overhead or along the body. Hips high, near the surface.',
        'Execution. Continuous kick from the hip. The knees should not break the surface; if they do, you are cycling.',
        'Common mistake. Sitting down, hips low and knees out. Draw the navel in and open the chest.',
        'What you should feel. This is the position that loads hip extension — the glute — hardest.',
      ],
    },
  }),
  E({
    id: 'patada-vertical',
    equipment: 'aletas',
    tags: ['cadera', 'piernas'],
    minLevel: 'medio',
    timeBased: true,
    es: {
      name: 'Patada vertical',
      query: 'patada vertical natacion entrenamiento',
      detail: [
        'Montaje. En la parte honda y pegado al bordillo o a la corchera, con aletas. Cuerpo vertical, brazos cruzados sobre el pecho.',
        'Ejecución. Ondulación continua, solo con las piernas, para mantenerte a flote con los hombros fuera del agua.',
        'Seguridad. Hazlo siempre donde puedas agarrarte de inmediato, y nunca si eres el único en la piscina. Si notas que te hundes, agárrate: no es un ejercicio de aguantar.',
        'Qué debes notar. Glúteo, cuádriceps y core a tope. Es de lo más exigente que se puede hacer en una piscina.',
      ],
    },
    en: {
      name: 'Vertical kicking',
      query: 'vertical kicking swimming training drill',
      detail: [
        'Set-up. In the deep end, next to the wall or lane rope, with fins. Body vertical, arms crossed over the chest.',
        'Execution. Continuous undulation, legs only, keeping your shoulders out of the water.',
        'Safety. Always do it where you can grab something instantly, and never when you are the only one in the pool. If you start sinking, grab it — this is not an endurance test.',
        'What you should feel. Glutes, quads and core at full effort. It is one of the hardest things you can do in a pool.',
      ],
    },
  }),

  // ------------------------------------------------------------ nado
  E({
    id: 'crol-medio',
    equipment: null,
    tags: ['continuo'],
    minLevel: 'inicio',
    es: {
      name: 'Crol a ritmo medio',
      query: 'tecnica brazada larga crol fondo ritmo',
      detail: [
        'Ejecución. Ritmo cómodo y sostenido, respiración cada 3 brazadas, buscando brazada larga en vez de frecuencia alta.',
        'Referencia de ritmo. Deberías poder decir una frase corta al llegar a la pared. Si no puedes, vas demasiado rápido para lo que pide este bloque.',
      ],
    },
    en: {
      name: 'Steady freestyle',
      query: 'freestyle distance per stroke pacing technique',
      detail: [
        'Execution. Comfortable, sustained pace, breathing every three strokes, chasing a long stroke rather than a high turnover.',
        'Pace check. You should be able to say a short sentence when you reach the wall. If you can’t, you are going faster than this block asks for.',
      ],
    },
  }),
  E({
    id: 'continuo',
    equipment: null,
    tags: ['continuo'],
    minLevel: 'inicio',
    es: {
      name: 'Continuo',
      query: 'nadar continuo sin parar tecnica respiracion',
      detail: [
        'Ejecución. Sin parar en ninguna pared. Ritmo que puedas sostener hablando entre frases cortas.',
        'Es el termómetro del plan. El día que lo hagas sin aletas y termines respirando por la nariz, has cambiado de nivel. Hasta entonces, usa aletas sin ningún complejo.',
      ],
    },
    en: {
      name: 'Continuous swim',
      query: 'continuous swim without stopping freestyle pacing',
      detail: [
        'Execution. No stopping at any wall. A pace you could sustain while speaking in short sentences.',
        'This is the plan’s thermometer. The day you do it without fins and finish breathing through your nose, you have changed level. Until then, use fins without any guilt.',
      ],
    },
  }),
  E({
    id: 'progresivos',
    equipment: null,
    tags: ['intervalos'],
    minLevel: 'inicio',
    es: {
      name: 'Progresivos',
      query: 'progresivos natacion entrenamiento series',
      detail: [
        'Ejecución. Cada largo empieza suave y acaba fuerte, subiendo de forma progresiva. No es nadar rápido: es aprender a cambiar de marcha.',
        'Para qué sirve. Prepara el cuerpo para las series duras sin gastarte antes de tiempo.',
      ],
    },
    en: {
      name: 'Build repeats',
      query: 'build swim repeats training set',
      detail: [
        'Execution. Each length starts easy and finishes fast, building progressively. This is not about swimming fast, it is about learning to change gear.',
        'Why. It prepares the body for the hard sets without burning you before they start.',
      ],
    },
  }),
  E({
    id: 'fuerte-corto',
    equipment: null,
    tags: ['intervalos'],
    minLevel: 'basico',
    es: {
      name: 'Series cortas fuertes',
      query: 'series cortas sprint natacion entrenamiento',
      detail: [
        'Ejecución. A tope. La referencia es llegar a la pared sin poder hablar, respirando por la boca.',
        'Regla de calidad. Si a partir de la mitad la brazada se te descompone y empiezas a bracear corto y rápido, alarga el descanso. Es preferible hacer menos repeticiones bien que todas mal.',
        'Para qué sirve. Es el bloque de mayor gasto calórico de la semana.',
      ],
    },
    en: {
      name: 'Short hard repeats',
      query: 'short sprint repeats swimming training set',
      detail: [
        'Execution. Flat out. The reference is reaching the wall unable to speak, breathing through your mouth.',
        'Quality rule. If halfway through the set your stroke falls apart and turns short and frantic, lengthen the rest. Fewer good repeats beat a full set of bad ones.',
        'Why. It is the highest calorie-burn block of the week.',
      ],
    },
  }),
  E({
    id: 'cambios-ritmo',
    equipment: null,
    tags: ['intervalos', 'continuo'],
    minLevel: 'basico',
    es: {
      name: 'Cambios de ritmo',
      query: 'series cambios de ritmo natacion entrenamiento',
      detail: [
        'Ejecución. Cada repetición son dos tramos: el primero fuerte y el segundo suave, sin parar entre ellos. El tramo suave es recuperación activa, no descanso.',
        'Para qué sirve. Enseña al cuerpo a recuperarse mientras sigue nadando, que es lo que más se parece a nadar de verdad.',
      ],
    },
    en: {
      name: 'Pace changes',
      query: 'negative split pace change swim set',
      detail: [
        'Execution. Each repeat is two halves: the first hard, the second easy, without stopping in between. The easy half is active recovery, not rest.',
        'Why. It teaches the body to recover while still swimming, which is what real swimming actually demands.',
      ],
    },
  }),
  E({
    id: 'ritmo-objetivo',
    equipment: null,
    tags: ['intervalos'],
    minLevel: 'medio',
    es: {
      name: 'Series a ritmo objetivo',
      query: 'series a ritmo objetivo natacion velocidad critica',
      detail: [
        'Ejecución. Cada repetición al ritmo que te marca la app, calculado desde tu test de 400 m. Ni más rápido ni más lento: el objetivo es sostenerlo.',
        'Error típico. Salir por debajo del ritmo en las primeras y morir en las últimas. Si la primera repetición te sale muy holgada, es que vas lento.',
        'Qué debes notar. Que las últimas cuestan bastante pero el ritmo no se cae. Ahí es donde se gana rendimiento.',
      ],
    },
    en: {
      name: 'Target pace repeats',
      query: 'threshold pace swim set critical swim speed',
      detail: [
        'Execution. Each repeat at the pace the app gives you, worked out from your 400 m test. No faster, no slower: the point is holding it.',
        'Common mistake. Going out under pace and dying at the end. If the first repeat feels very comfortable, you are going too slow.',
        'What you should feel. The last repeats cost a lot but the pace holds. That is where performance is built.',
      ],
    },
  }),
  E({
    id: 'test-400',
    equipment: null,
    tags: ['test'],
    minLevel: 'inicio',
    es: {
      name: 'Test de 400 m',
      query: 'test 400 metros natacion velocidad critica ritmo',
      detail: [
        'Montaje. Después de un calentamiento suave. Necesitas un reloj o el cronómetro del móvil en el bordillo.',
        'Ejecución. 400 metros lo más rápido que puedas sostener de principio a fin, sin parar. No es un sprint: si el último 100 se te cae mucho, has salido demasiado fuerte.',
        'Qué se saca de aquí. Tu ritmo de referencia por 100 metros. Con él la app calcula las velocidades de todas las series del ciclo.',
        'Al terminar, apunta el tiempo total en la app. Si no llegas a los 400, apunta lo que hayas hecho y la distancia: también sirve.',
      ],
    },
    en: {
      name: '400 m test',
      query: '400m swim test critical swim speed pace',
      detail: [
        'Set-up. After an easy warm-up. You need a watch or your phone’s stopwatch on the wall.',
        'Execution. 400 metres as fast as you can hold from start to finish, without stopping. It is not a sprint: if the last 100 falls apart, you went out too hard.',
        'What it gives you. Your reference pace per 100 metres. The app uses it to set the speed of every set in the cycle.',
        'When you finish, enter the total time. If you can’t reach 400, enter what you did and the distance — that works too.',
      ],
    },
  }),

  // ------------------------------------------------------------ estilos
  E({
    id: 'espalda-tecnica',
    equipment: null,
    tags: ['tecnica'],
    minLevel: 'inicio',
    es: {
      name: 'Espalda: patada y posición',
      query: 'espalda natacion patada posicion tecnica',
      detail: [
        'Montaje. Boca arriba, orejas metidas en el agua, cadera alta cerca de la superficie, brazos pegados al cuerpo o estirados por encima de la cabeza.',
        'Ejecución. Patada continua desde la cadera, hombros y cadera girando juntos como un bloque a cada patada. Este ejercicio es de posición y patada — la brazada completa se trabaja en espalda continua.',
        'Error típico. Mirar hacia los pies en vez de al techo. La cabeza fija mirando arriba es lo que mantiene la cadera alta.',
        'Aviso. En espalda no ves hacia dónde vas. En calle compartida, cuenta los largos y mira hacia atrás antes de acercarte a la pared — el golpe de cabeza contra la pared o contra otro nadador es el accidente más típico de este estilo.',
        'Qué debes notar. Que respiras sin esfuerzo, porque la cara nunca se moja. Es el estilo más cómodo para aprender a respirar sin agobios.',
      ],
    },
    en: {
      name: 'Backstroke: kick and position',
      query: 'backstroke swimming kick position technique',
      detail: [
        'Set-up. On your back, ears in the water, hips high near the surface, arms along the body or extended overhead.',
        'Execution. Continuous kick from the hip, shoulders and hips rolling together as one unit with each kick. This drill is about position and kick — the full stroke is trained in continuous backstroke.',
        'Common mistake. Looking at your feet instead of the ceiling. Keeping the head fixed looking up is what keeps the hips high.',
        'Warning. In backstroke you cannot see where you are going. In a shared lane, count your lengths and look back before nearing the wall — hitting your head on the wall or on another swimmer is the most common accident with this stroke.',
        'What you should feel. That you breathe without effort, since your face never gets wet. It is the easiest stroke to learn to breathe without stress in.',
      ],
    },
  }),
  E({
    id: 'espalda-continuo',
    equipment: null,
    tags: ['continuo'],
    minLevel: 'basico',
    es: {
      name: 'Espalda continua',
      query: 'nadar espalda continuo tecnica resistencia',
      detail: [
        'Ejecución. Espalda completa, sin parar, a un ritmo que puedas sostener toda la serie. Cuenta las brazadas por largo: si varían mucho de uno a otro, estás cambiando el gesto por cansancio.',
        'Para qué sirve. Es el complemento perfecto al crol: trabaja el hombro en el sentido contrario y descansa la zona cervical, que el crol carga al respirar de lado.',
      ],
    },
    en: {
      name: 'Continuous backstroke',
      query: 'continuous backstroke swimming endurance drill',
      detail: [
        'Execution. Full backstroke, without stopping, at a pace you can hold for the whole set. Count strokes per length: if they vary a lot, your technique is drifting from fatigue.',
        'Why. It is the perfect complement to freestyle: it works the shoulder the opposite way and rests the neck, which freestyle loads while breathing to the side.',
      ],
    },
  }),
  E({
    id: 'braza-tecnica',
    equipment: null,
    tags: ['tecnica'],
    minLevel: 'inicio',
    es: {
      name: 'Braza: tiempo y deslizamiento',
      query: 'braza natacion tecnica tiempo deslizamiento',
      detail: [
        'Montaje. Boca abajo, brazos estirados delante, piernas juntas.',
        'Ejecución. El orden es tirar, respirar, meter la patada, deslizar. Después de cada patada, un instante estirado en línea antes de la siguiente brazada — es la parte que todo el mundo se salta.',
        'Error típico. Encadenar brazada y patada sin la pausa de deslizamiento. Sin ese instante de estirarse, la braza gasta el doble de energía para avanzar lo mismo.',
        'Aviso. La rodilla es la lesión más común de este estilo. Las rodillas no se abren más que la cadera al recoger los talones; si notas un pinchazo en la cara interna de la rodilla, para y cambia a otro estilo ese día.',
        'Qué debes notar. Que avanzas más en el deslizamiento que en la propia brazada. Si no lo notas, estás apurando el ejercicio.',
      ],
    },
    en: {
      name: 'Breaststroke: timing and glide',
      query: 'breaststroke swimming timing glide technique',
      detail: [
        'Set-up. Face down, arms extended in front, legs together.',
        'Execution. The order is pull, breathe, kick, glide. After every kick, hold a streamlined moment before the next pull — it is the part everyone skips.',
        'Common mistake. Chaining the pull and the kick without the glide pause. Without that streamlined moment, breaststroke burns twice the energy to cover the same distance.',
        'Warning. The knee is this stroke’s most common injury. The knees never open wider than the hips as the heels come up; if you feel a twinge on the inside of the knee, stop and switch to another stroke that day.',
        'What you should feel. That you travel further during the glide than during the pull itself. If you don’t, you are rushing the drill.',
      ],
    },
  }),
  E({
    id: 'braza-continuo',
    equipment: null,
    tags: ['continuo'],
    minLevel: 'basico',
    es: {
      name: 'Braza continua',
      query: 'nadar braza continuo tecnica resistencia',
      detail: [
        'Ejecución. Braza completa, sin parar, manteniendo el orden tirar-respirar-patada-deslizar aunque te canses. Es el primer gesto que se pierde con la fatiga.',
        'Referencia de ritmo. Es el estilo más lento de los cuatro: no lo compares con tu ritmo de crol, compáralo contigo mismo de una semana a otra.',
      ],
    },
    en: {
      name: 'Continuous breaststroke',
      query: 'continuous breaststroke swimming endurance drill',
      detail: [
        'Execution. Full breaststroke, without stopping, keeping the pull-breathe-kick-glide order even as you tire. It is the first thing fatigue takes away.',
        'Pace check. It is the slowest of the four strokes: don’t compare it to your freestyle pace, compare it to yourself week over week.',
      ],
    },
  }),
  E({
    id: 'mariposa-tecnica',
    equipment: null,
    tags: ['tecnica'],
    minLevel: 'avanzado',
    neverAmplify: true,
    es: {
      name: 'Mariposa: nado corto',
      query: 'mariposa natacion tecnica series cortas',
      detail: [
        'Montaje. Series cortas, con descanso completo entre repeticiones. La mariposa se rompe por fatiga antes que por técnica.',
        'Ejecución. Dos ondulaciones por ciclo de brazos: una cuando entran las manos, otra cuando salen. Los brazos recuperan estirados y bajos, casi rozando el agua, y las manos salen a la altura de la cadera con el meñique hacia arriba — no hay codo alto en la recuperación de mariposa, eso es crol.',
        'Respiración. Barbilla hacia delante y baja, apenas lo justo para coger aire, sin sacar la cabeza hacia arriba. Sacarla hunde la cadera y rompe la ondulación en el acto.',
        'Aviso. Es el estilo más exigente de hombro que existe, y la zona lumbar también carga si la ondulación nace de la espalda en vez de la cadera. Para en cuanto la brazada se descomponga — seguir con la técnica rota y cansado es la forma más directa de lesionarse.',
        'Qué debes notar. Que el cuerpo ondula solo, como una ola, y los brazos casi se limitan a acompañar. Si vas a fuerza de brazo, vas a durar poco.',
      ],
    },
    en: {
      name: 'Butterfly: short swim',
      query: 'butterfly swimming technique short repeats',
      detail: [
        'Set-up. Short repeats, with full rest between them. Butterfly breaks down from fatigue long before it breaks down from technique.',
        'Execution. Two body undulations per arm cycle: one as the hands enter, one as they exit. The arms recover straight and low, almost skimming the water, hands exiting at hip height with the pinky up — there is no high elbow in the butterfly recovery, that is freestyle.',
        'Breathing. Chin forward and low, just enough to get air, without lifting the head up. Lifting it sinks the hips and breaks the undulation instantly.',
        'Warning. It is the most shoulder-demanding stroke there is, and the lower back loads too if the undulation starts from the back instead of the hips. Stop the moment your stroke falls apart — pushing through tired, broken technique is the most direct route to injury.',
        'What you should feel. That the body undulates on its own, like a wave, and the arms mostly just come along. If you are muscling it with your arms, you will not last long.',
      ],
    },
  }),

  // ------------------------------------------------------------ en seco
  E({
    id: 'seco-empuje',
    equipment: null,
    tags: ['seco'],
    minLevel: 'inicio',
    timeBased: true,
    es: {
      name: 'Bloque en seco · empuje',
      query: 'rutina en seco nadadores empuje hombro core',
      detail: [
        'Flexiones 3×8-12, sentadilla 3×12, puente de glúteo 3×15, plancha 3×30-40 s y rotación externa de hombro con goma 2×15.',
        'Por qué está aquí. Nadando trabajas mucho el gesto de tirar y casi nada el de empujar, y ese desequilibrio es una causa común de molestias de hombro.',
        'Y lo importante. Si tu objetivo es tonificar, esta es la parte que lo consigue. El agua no ofrece carga progresiva; el suelo sí.',
      ],
    },
    en: {
      name: 'Dry-land block · push',
      query: 'dryland routine for swimmers shoulder core',
      detail: [
        'Push-ups 3×8-12, squats 3×12, glute bridge 3×15, plank 3×30-40 s and banded external shoulder rotation 2×15.',
        'Why it is here. Swimming trains pulling heavily and pushing almost not at all, and that imbalance is a common source of shoulder trouble.',
        'And the important part. If your goal is tone, this is the part that delivers it. Water offers no progressive overload; the floor does.',
      ],
    },
  }),
]

export const EXERCISE_BY_ID: ReadonlyMap<string, Exercise> = new Map(
  EXERCISES.map((e) => [e.id, e]),
)

export function getExercise(id: string): Exercise {
  const found = EXERCISE_BY_ID.get(id)
  if (!found) throw new Error('Ejercicio desconocido: ' + id)
  return found
}
