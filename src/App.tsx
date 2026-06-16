import { useState } from 'react';
import CaseModel2D from './CaseModel2D';
import CaseOpeningOverlay from './CaseOpeningOverlay';

type CaseId = 'cargo' | 'customs' | 'captain' | 'legendary';
type Page = 'menu' | 'gamble' | 'inventory';

type LootItem = {
  id: string;
  name: string;
  chance: string;
};

type InventoryItem = LootItem & {
  inventoryId: string;
  caseName: string;
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
      'Базовый грузовой кейс с понятным лутом: контейнеры, коробки, погрузчики, сканеры и редкие предметы склада.',
    price: 'FREE',
    loot: [
      { id: 'straps', name: 'Грузовая палета', chance: '28%' },
      { id: 'manifest', name: 'Большая коробка', chance: '20%' },
      { id: 'seal', name: 'Контейнер', chance: '15%' },
      { id: 'hook', name: 'Погрузчик', chance: '11%' },
      { id: 'scanner', name: 'Сканер груза', chance: '8%' },
      { id: 'lock', name: 'Складской замок', chance: '6%' },
      { id: 'tracker', name: 'Грузовой трекер', chance: '4.5%' },
      { id: 'cooler', name: 'Холодильный контейнер', chance: '3%' },
      { id: 'gold-seal', name: 'Золотой контейнер', chance: '2%' },
      { id: 'legend-key', name: 'Ключ от склада', chance: '0.5%' },
    ],
  },
  {
    id: 'customs',
    name: 'Airport Case',
    label: 'Airport Security',
    headline: 'Runway Drop',
    description:
      'Кейс в тематике аэропорта с понятным лутом: самолеты, чемоданы, посадочные талоны, сканеры и редкие предметы со взлетной полосы.',
    price: '120',
    loot: [
      { id: 'airplane', name: 'Самолет', chance: '30%' },
      { id: 'suitcase', name: 'Чемодан', chance: '22%' },
      { id: 'boarding-pass', name: 'Посадочный талон', chance: '16%' },
      { id: 'passport', name: 'Паспорт', chance: '11%' },
      { id: 'xray-scanner', name: 'Ручной X-ray сканер', chance: '8%' },
      { id: 'control-tower', name: 'Диспетчерская башня', chance: '6%' },
      { id: 'runway-light', name: 'Огни взлетной полосы', chance: '4%' },
      { id: 'black-box', name: 'Черный ящик', chance: '2%' },
      { id: 'gold-plane', name: 'Золотой самолет', chance: '0.8%' },
      { id: 'airport-bomb', name: 'Аэропортовая бомба', chance: '0.2%' },
    ],
  },
  {
    id: 'captain',
    name: "Captain's Cargo Case",
    label: 'Harbor Elite',
    headline: 'Captain Drop',
    description:
      'Редкий морской кейс с понятным лутом: корабли, якоря, компасы, карты и капитанские сокровища.',
    price: '450',
    loot: [
      { id: 'nav-map', name: 'Карта сокровищ', chance: '26%' },
      { id: 'captain-seal', name: 'Капитанская медаль', chance: '19%' },
      { id: 'signal-lamp', name: 'Маяк', chance: '14%' },
      { id: 'anchor-hook', name: 'Якорь', chance: '11%' },
      { id: 'steel-lock', name: 'Морской сундук', chance: '9%' },
      { id: 'sonar-tracker', name: 'Радар корабля', chance: '7%' },
      { id: 'captain-compass', name: 'Компас', chance: '5%' },
      { id: 'ocean-core', name: 'Жемчужина океана', chance: '4%' },
      { id: 'royal-seal', name: 'Золотая корона', chance: '3%' },
      { id: 'captain-key', name: 'Ключ капитана', chance: '2%' },
    ],
  },
  {
    id: 'legendary',
    name: 'Legendary Terminal Case',
    label: 'Terminal Mythic',
    headline: 'Terminal Jackpot',
    description:
      'Легендарный кейс терминала с понятным лутом: дроны, карты доступа, кристаллы, сейфы и мифические ключи.',
    price: '1200',
    loot: [
      { id: 'neon-core', name: 'Неоновый кристалл', chance: '24%' },
      { id: 'quantum-pass', name: 'VIP карта доступа', chance: '18%' },
      { id: 'terminal-key', name: 'Ключ терминала', chance: '14%' },
      { id: 'plasma-scanner', name: 'Лазерный сканер', chance: '11%' },
      { id: 'data-cube', name: 'Куб данных', chance: '9%' },
      { id: 'mythic-seal', name: 'Мифический жетон', chance: '7%' },
      { id: 'vault-lock', name: 'Сейф', chance: '6%' },
      { id: 'drone-chip', name: 'Дрон', chance: '5%' },
      { id: 'crown-badge', name: 'Корона джекпота', chance: '4%' },
      { id: 'omega-key', name: 'Омега-ключ', chance: '2%' },
    ],
  },
];

export default function App() {
  const [page, setPage] = useState<Page>('menu');
  const [selectedCaseId, setSelectedCaseId] = useState<CaseId | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const selectedCase =
    caseDefinitions.find((entry) => entry.id === selectedCaseId) ?? caseDefinitions[0];

  const claimItem = (item: LootItem) => {
    setInventoryItems((currentItems) => [
      {
        ...item,
        inventoryId: `${selectedCase.id}-${item.id}-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`,
        caseName: selectedCase.name,
      },
      ...currentItems,
    ]);
    setIsOpening(false);
  };

  if (page === 'menu') {
    return (
      <main className="menu-page">
        <section className="menu-shell" aria-label="Main menu">
          <button className="menu-action gamble-action" type="button" onClick={() => setPage('gamble')}>
            Gamble
          </button>
          <button
            className="menu-action inventory-action"
            type="button"
            onClick={() => setPage('inventory')}
          >
            Inventory
          </button>
        </section>
      </main>
    );
  }

  if (page === 'inventory') {
    return (
      <main className="inventory-page">
        <section className="inventory-shell">
          <button className="back-button" type="button" onClick={() => setPage('menu')}>
            Back
          </button>
          <div className="inventory-header">
            <span className="catalog-kicker">Inventory</span>
            <h1>Inventory</h1>
          </div>
          {inventoryItems.length > 0 ? (
            <div className="loot-list inventory-list" aria-label="Claimed items">
              {inventoryItems.map((item) => (
                <div className="loot-card" key={item.inventoryId}>
                  <div className={`loot-icon loot-${item.id}`} aria-hidden="true" />
                  <span>{item.name}</span>
                  <strong>{item.chance}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="inventory-empty">
              <p>Your items will appear here.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

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
            onClaim={claimItem}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className="catalog-page">
      <section className="catalog-shell">
        <button className="back-button catalog-back" type="button" onClick={() => setPage('menu')}>
          Back
        </button>
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
