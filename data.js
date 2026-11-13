// Inhoud: klanken, woorden (met Oekraïense vertaling) en luisterparen.
// tip = uitleg in eenvoudig Nederlands, tipUk = dezelfde uitleg in het Oekraïens.

const SOUNDS = [
  {
    id: 'ui', label: 'ui', example: 'huis',
    tip: 'Begin met een open klank met ronde lippen (een beetje zoals "eu") en glijd naar "uu". Je lippen blijven de hele tijd rond. Het is niet "oj" en niet "aj".',
    tipUk: 'Почніть із відкритого звука із заокругленими губами (схожого на німецьке ö) і плавно перейдіть до звука [y] (як німецьке ü). Губи весь час заокруглені. Це не «ой» і не «ай».',
    words: [['huis', 'дім'], ['uit', 'з / назовні'], ['tuin', 'сад'], ['buiten', 'надворі'], ['bruin', 'коричневий'], ['fruit', 'фрукти'], ['duizend', 'тисяча'], ['muis', 'миша'], ['zuiden', 'південь'], ['ui', 'цибуля']]
  },
  {
    id: 'eu', label: 'eu', example: 'neus',
    tip: 'Zeg een lange "ee" en maak je lippen rond, zoals bij "oo". De tong blijft vooraan in de mond.',
    tipUk: 'Скажіть довге нідерландське ee і заокругліть губи, як для «о». Язик залишається попереду. Схоже на німецьке ö.',
    words: [['neus', 'ніс'], ['deur', 'двері'], ['keuken', 'кухня'], ['leuk', 'гарний / класний'], ['kleur', 'колір'], ['euro', 'євро'], ['beurt', 'черга'], ['reus', 'велетень']]
  },
  {
    id: 'ij', label: 'ij / ei', example: 'tijd',
    tip: 'Begin met een open "e" (mond wat verder open dan bij "bed") en glijd naar "ie". De ij en de ei klinken precies hetzelfde.',
    tipUk: 'Почніть із відкритого «е» (рот відкритий трохи ширше — між «е» та «а») і плавно перейдіть до «й». ij та ei звучать абсолютно однаково.',
    words: [['tijd', 'час'], ['klein', 'малий'], ['wijn', 'вино'], ['ijs', 'лід / морозиво'], ['mijn', 'мій'], ['trein', 'поїзд'], ['reis', 'подорож'], ['blij', 'радий']]
  },
  {
    id: 'u', label: 'u (kort)', example: 'bus',
    tip: 'Een korte klank. Zeg de korte "i" van "vis" en maak je lippen rond. Het is geen "oe" en geen "uu".',
    tipUk: 'Короткий звук. Скажіть нідерландське коротке i (воно схоже на українське «и») і заокругліть губи. Це не «у» і не «ю».',
    words: [['bus', 'автобус'], ['kus', 'поцілунок'], ['dun', 'тонкий'], ['druk', 'зайнятий / людно'], ['rug', 'спина'], ['stuk', 'шматок'], ['put', 'колодязь'], ['brug', 'міст']]
  },
  {
    id: 'uu', label: 'uu', example: 'muur',
    tip: 'Zeg "ie" en maak je lippen helemaal rond, zoals bij "oe". De tong blijft op de plaats van "ie". Zeg geen "j" ervoor.',
    tipUk: 'Скажіть «і» та сильно заокругліть губи, як для «у». Язик залишається в позиції «і». Це як німецьке ü. Не кажіть «ю» — на початку немає «й».',
    words: [['muur', 'стіна'], ['uur', 'година'], ['duur', 'дорогий'], ['nu', 'зараз'], ['minuut', 'хвилина'], ['vuur', 'вогонь'], ['buurman', 'сусід'], ['student', 'студент']]
  },
  {
    id: 'lang', label: 'kort / lang', example: 'man – maan',
    tip: 'Korte en lange klinkers geven een ander woord: man – maan. De korte a is kort en donker, achter in de mond. De lange aa is lang en helder, met de mond wijd open. De lange ee en oo zijn lang en gespannen.',
    tipUk: 'Короткі й довгі голосні дають різні слова: man (чоловік) – maan (місяць). Коротке a — коротке й «темне», вимовляється глибше в роті. Довге aa — довге і світле, рот широко відкритий, ближче до українського «а». Довгі ee та oo — напружені, наприкінці ледь звужуються (ee → «ей», oo → «оу»).',
    words: [['man', 'чоловік'], ['maan', 'місяць (на небі)'], ['bom', 'бомба'], ['boom', 'дерево'], ['zon', 'сонце'], ['zoon', 'син'], ['pen', 'ручка'], ['been', 'нога'], ['naam', "ім'я"], ['straat', 'вулиця']]
  },
  {
    id: 'ie', label: 'i / ie', example: 'vis – vies',
    tip: 'De korte i (vis) lijkt op de Oekraïense "и". De ie (vies) lijkt op de Oekraïense "і". Gebruik dat verschil!',
    tipUk: 'Коротке i (vis) дуже схоже на українське «и». А ie (vies) — це українське «і». Використовуйте цю різницю!',
    words: [['vis', 'риба'], ['vies', 'брудний'], ['zitten', 'сидіти'], ['zien', 'бачити'], ['dik', 'товстий'], ['drie', 'три'], ['fiets', 'велосипед'], ['winkel', 'магазин'], ['niet', 'не']]
  },
  {
    id: 'g', label: 'g / ch', example: 'goed',
    tip: 'De g en de ch klinken bijna hetzelfde: een schurende klank achter in de mond, zoals de Oekraïense "х", maar sterker. Het is nooit de Oekraïense "г" en nooit de "ґ".',
    tipUk: 'g та ch звучать майже однаково: шумний звук у задній частині рота, як українське «х», але сильніший і більш «шорсткий». Це ніколи не українське «г» і не «ґ».',
    words: [['goed', 'добре'], ['gaan', 'іти'], ['groot', 'великий'], ['geel', 'жовтий'], ['acht', 'вісім'], ['nacht', 'ніч'], ['lachen', 'сміятися'], ['dag', 'день'], ['graag', 'охоче']]
  },
  {
    id: 'h', label: 'h', example: 'hoed',
    tip: 'De Nederlandse h is zacht, bijna alleen adem — zoals de Oekraïense "г". Onthoud: h klinkt als "г", g klinkt als "х". Hoed is niet goed!',
    tipUk: "Нідерландське h — м'який звук, майже просто видих, дуже схожий на українське «г». Запам'ятайте: h ≈ «г», а g ≈ «х». Hoed (капелюх) — це не goed (добре)!",
    words: [['hoed', 'капелюх'], ['hebben', 'мати'], ['hoofd', 'голова'], ['hier', 'тут'], ['hallo', 'привіт'], ['hand', 'рука'], ['helpen', 'допомагати'], ['hoog', 'високий']]
  },
  {
    id: 'sch', label: 'sch', example: 'school',
    tip: 'Zeg eerst "s" en dan direct de Nederlandse "ch": s + ch. Het is niet "sj" en niet "sk". Aan het einde van een woord (-isch) zeg je alleen "ies".',
    tipUk: 'Спочатку «с», а потім одразу «х»: с + х. Це не «ш» і не «ск». School звучить приблизно як «схоол». Закінчення -isch вимовляється просто як «іс».',
    words: [['school', 'школа'], ['schoen', 'черевик'], ['schip', 'корабель'], ['schrijven', 'писати'], ['schoon', 'чистий'], ['schaap', 'вівця'], ['schaar', 'ножиці'], ['fantastisch', 'фантастичний']]
  },
  {
    id: 'ng', label: 'ng', example: 'zingen',
    tip: 'Eén klank door de neus: de achterkant van de tong ligt tegen het zachte gehemelte. Je hoort geen "g" en geen "k" aan het einde.',
    tipUk: "Один носовий звук: задня частина язика торкається м'якого піднебіння (як «н» у слові «банк»). Після нього не вимовляйте ні «г», ні «к».",
    words: [['zingen', 'співати'], ['lang', 'довгий'], ['jong', 'молодий'], ['ring', 'каблучка'], ['vinger', 'палець'], ['koning', 'король'], ['bang', 'наляканий'], ['honger', 'голод']]
  },
  {
    id: 'sjwa', label: 'stomme e', example: 'lopen',
    tip: 'Een heel korte, zwakke klank zonder klemtoon. Je hoort hem in "de", in het einde -en, en ook in -lijk en -ig. Bij -en hoor je de n vaak bijna niet: "lopen" klinkt als "lope".',
    tipUk: '«Німе е» [ə] — дуже короткий, слабкий, ненаголошений звук, щось середнє між «е» та «и». Він є в de, у закінченні -en, а також у -lijk [лек] та -ig [ех]. У закінченні -en звук n часто майже не чути: lopen звучить як «лопе».',
    words: [['de', 'означений артикль'], ['lopen', 'ходити'], ['moeder', 'мати'], ['vader', 'батько'], ['eten', 'їсти'], ['tafel', 'стіл'], ['gezellig', 'затишно'], ['mogelijk', 'можливо']]
  },
  {
    id: 'ou', label: 'ou / au', example: 'koud',
    tip: 'Begin met een open klank tussen "a" en "o" en glijd naar "oe". De ou en de au klinken precies hetzelfde.',
    tipUk: 'Почніть із відкритого звука між «а» та «о» і плавно перейдіть до «у». Схоже на «ау». ou та au звучать абсолютно однаково.',
    words: [['koud', 'холодний'], ['blauw', 'синій'], ['vrouw', 'жінка'], ['oud', 'старий'], ['zout', 'сіль'], ['pauze', 'пауза'], ['goud', 'золото'], ['nou', 'ну']]
  },
  {
    id: 'eind', label: 'd / b aan het einde', example: 'hond',
    tip: 'Aan het einde van een woord klinkt d als "t" en b als "p". In het Oekraïens gebeurt dat niet, in het Nederlands altijd: "hond" klinkt als "hont".',
    tipUk: 'Наприкінці слова d звучить як «т», а b — як «п». В українській дзвінкі приголосні в кінці слова не оглушуються, а в нідерландській — завжди: hond звучить як «гонт», heb — як «геп».',
    words: [['hond', 'собака'], ['bed', 'ліжко'], ['brood', 'хліб'], ['heb', '(я) маю'], ['tand', 'зуб'], ['paard', 'кінь'], ['kind', 'дитина'], ['stad', 'місто'], ['club', 'клуб']]
  }
];

// Luisterparen: twee woorden die bijna hetzelfde klinken.
const CONTRASTS = [
  { id: 'a-aa', label: 'kort / lang', sound: 'lang', pairs: [['man', 'maan'], ['tak', 'taak'], ['mat', 'maat'], ['bom', 'boom'], ['zon', 'zoon'], ['bot', 'boot'], ['pen', 'peen'], ['vel', 'veel']] },
  { id: 'i-ie', label: 'i / ie', sound: 'ie', pairs: [['vis', 'vies'], ['lip', 'liep'], ['zit', 'ziet'], ['wil', 'wiel']] },
  { id: 'u-oe', label: 'u / oe', sound: 'u', pairs: [['dun', 'doen'], ['mus', 'moes'], ['bukken', 'boeken'], ['hut', 'hoed']] },
  { id: 'uu-oe', label: 'uu / oe', sound: 'uu', pairs: [['vuur', 'voer'], ['buur', 'boer'], ['uur', 'oer'], ['muur', 'moer']] },
  { id: 'ui-ij', label: 'ui / ij', sound: 'ui', pairs: [['luik', 'lijk'], ['kuiken', 'kijken'], ['ruim', 'rijm'], ['buiten', 'bijten']] },
  { id: 'ui-eu', label: 'ui / eu', sound: 'ui', pairs: [['luik', 'leuk'], ['ruis', 'reus'], ['huis', 'heus'], ['buik', 'beuk']] },
  { id: 'eu-ee', label: 'eu / ee', sound: 'eu', pairs: [['leuk', 'leek'], ['beuk', 'beek'], ['heus', 'hees'], ['leun', 'leen']] },
  { id: 'ij-ee', label: 'ij / ee', sound: 'ij', pairs: [['bijt', 'beet'], ['mijn', 'meen'], ['pijn', 'peen'], ['wijk', 'week']] },
  { id: 'g-h', label: 'g / h', sound: 'h', pairs: [['goed', 'hoed'], ['geel', 'heel'], ['gaan', 'haan'], ['gek', 'hek'], ['gier', 'hier']] },
  { id: 'g-k', label: 'g / k', sound: 'g', pairs: [['gat', 'kat'], ['goud', 'koud'], ['gaas', 'kaas'], ['gok', 'kok'], ['geel', 'keel']] },
  { id: 'ng-n', label: 'ng / n', sound: 'ng', pairs: [['zing', 'zin'], ['bang', 'ban'], ['tong', 'ton'], ['vang', 'van']] }
];
