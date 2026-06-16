import { useState } from 'react';
import CaseModel2D from './CaseModel2D';
import CaseOpeningOverlay from './CaseOpeningOverlay';

type CaseId = 'cargo' | 'customs' | 'captain' | 'legendary';

type LootItem = {
  id: string;
  name: string;
  chance: string;
};

type CaseDefinition = {
  id: CaseId;
  name: string;
  label: string;
  headline: string;
  description: string;
  price: string;
  loot: LootItem[];
};

const caseDefinitions: CaseDefinition[] = [
  {
    id: 'cargo',
    name: 'Cargo Case',
    label: 'Dock Standard',
    headline: 'Container Drop',
    description:
      'Базовый портовый кейс с логистическим лутом, документами и инструментами для груза.',
    price: 'FREE',
    loot: [
      { id: 'straps', name: 'Ремни для крепления груза', chance: '28%' },
      { id: 'manifest', name: 'Транспортная накладная', chance: '20%' },
      { id: 'seal', name: 'Пломба контейнера', chance: '15%' },
      { id: 'hook', name: 'Погрузочный крюк', chance: '11%' },
      { id: 'scanner', name: 'Портативный сканер груза', chance: '8%' },
      { id: 'lock', name: 'Усиленный контейнерный замок', chance: '6%' },
      { id: 'tracker', name: 'Трекер для контейнера', chance: '4.5%' },
      { id: 'cooler', name: 'Холодильный модуль', chance: '3%' },
      { id: 'gold-seal', name: 'Золотая пломба капитана', chance: '2%' },
      { id: 'legend-key', name: 'Легендарный ключ от спецконтейнера', chance: '0.5%' },
    ],
  },
  {
    id: 'customs',
    name: 'Customs Case',
    label: 'Border Control',
    headline: 'Inspection Drop',
    description:
      'Кейс таможни с пропусками, штампами, сканерами и служебными предметами досмотра.',
    price: '120',
    loot: [
      { id: 'stamp', name: 'Таможенный штамп', chance: '30%' },
      { id: 'declaration', name: 'Декларация груза', chance: '22%' },
      { id: 'badge', name: 'Инспекторский бейдж', chance: '16%' },
      { id: 'gloves', name: 'Перчатки досмотра', chance: '11%' },
      { id: 'xray-scanner', name: 'Ручной X-ray сканер', chance: '8%' },
      { id: 'secure-pass', name: 'Пропуск в зону досмотра', chance: '6%' },
      { id: 'customs-chip', name: 'Чип контроля контейнера', chance: '4%' },
      { id: 'evidence-box', name: 'Бокс для улик', chance: '2%' },
      { id: 'gold-badge', name: 'Золотой знак инспектора', chance: '0.8%' },
      { id: 'master-clearance', name: 'Мастер-разрешение терминала', chance: '0.2%' },
    ],
  },
  {
    id: 'captain',
    name: "Captain's Cargo Case",
    label: 'Harbor Elite',
    headline: 'Captain Drop',
    description:
      'Редкий морской кейс капитана с элитными пломбами, навигацией и усиленным контейнерным снаряжением.',
    price: '450',
    loot: [
      { id: 'nav-map', name: 'Карта морского маршрута', chance: '26%' },
      { id: 'captain-seal', name: 'Пломба капитана', chance: '19%' },
      { id: 'signal-lamp', name: 'Сигнальная лампа', chance: '14%' },
      { id: 'anchor-hook', name: 'Якорный крюк', chance: '11%' },
      { id: 'steel-lock', name: 'Стальной капитанский замок', chance: '9%' },
      { id: 'sonar-tracker', name: 'Сонарный трекер', chance: '7%' },
      { id: 'captain-compass', name: 'Капитанский компас', chance: '5%' },
      { id: 'ocean-core', name: 'Ядро океанского модуля', chance: '4%' },
      { id: 'royal-seal', name: 'Королевская пломба порта', chance: '3%' },
      { id: 'captain-key', name: 'Легендарный ключ капитана', chance: '2%' },
    ],
  },
  {
    id: 'legendary',
    name: 'Legendary Terminal Case',
    label: 'Terminal Mythic',
    headline: 'Terminal Jackpot',
    description:
      'Легендарный терминальный кейс с самыми редкими технологичными предметами и золотыми артефактами порта.',
    price: '1200',
    loot: [
      { id: 'neon-core', name: 'Неоновое ядро терминала', chance: '24%' },
      { id: 'quantum-pass', name: 'Квантовый пропуск порта', chance: '18%' },
      { id: 'terminal-key', name: 'Ключ терминального сектора', chance: '14%' },
      { id: 'plasma-scanner', name: 'Плазменный сканер', chance: '11%' },
      { id: 'data-cube', name: 'Куб данных контейнера', chance: '9%' },
      { id: 'mythic-seal', name: 'Мифическая пломба', chance: '7%' },
      { id: 'vault-lock', name: 'Замок хранилища', chance: '6%' },
      { id: 'drone-chip', name: 'Чип дрона терминала', chance: '5%' },
      { id: 'crown-badge', name: 'Корона терминала', chance: '4%' },
      { id: 'omega-key', name: 'Омега-ключ спецдока', chance: '2%' },
    ],
  },
];

export default function App() {
  const [selectedCaseId, setSelectedCaseId] = useState<CaseId | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const selectedCase =
    caseDefinitions.find((entry) => entry.id === selectedCaseId) ?? caseDefinitions[0];

  if (selectedCaseId) {
    return (
      <main className={`details-page details-${selectedCase.id}`}>
        <section className="details-shell">
          <button className="back-button" type="button" onClick={() => setSelectedCaseId(null)}>
            Back
          </button>

          <div className="details-hero">
            <div className="details-copy">
              <span className="details-kicker">{selectedCase.name}</span>
              <h1>{selectedCase.headline}</h1>
              <p>{selectedCase.description}</p>
              <button className="open-case-button" type="button" onClick={() => setIsOpening(true)}>
                Open case
              </button>
            </div>

            <div className="details-preview">
              <CaseModel2D
                caseId={selectedCase.id}
                compact
                title={selectedCase.name}
                price={selectedCase.price}
                onOpen={() => {}}
              />
            </div>
          </div>

          <section className="loot-panel" aria-label="Loot table">
            <h2>Possible drops</h2>
            <div className="loot-list">
              {selectedCase.loot.map((item) => (
                <div className="loot-card" key={item.id}>
                  <div className={`loot-icon loot-${item.id}`} aria-hidden="true" />
                  <span>{item.name}</span>
                  <strong>{item.chance}</strong>
                </div>
              ))}
            </div>
          </section>
        </section>
        {isOpening ? (
          <CaseOpeningOverlay
            caseName={selectedCase.name}
            items={selectedCase.loot}
            onClose={() => setIsOpening(false)}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className="catalog-page">
      <section className="catalog-shell">
        <div className="catalog-copy">
          <span className="catalog-kicker">Port Cases</span>
          <h1>Choose a drop</h1>
          <p>Открой нужный кейс и посмотри уникальные предметы и шансы выпадения.</p>
        </div>

        <div className="catalog-grid">
          {caseDefinitions.map((entry) => (
            <CaseModel2D
              key={entry.id}
              caseId={entry.id}
              title={entry.name}
              price={entry.price}
              onOpen={() => setSelectedCaseId(entry.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
