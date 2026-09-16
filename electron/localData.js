// Данные для модулей, которые в этой версии прототипа НЕ синхронизируются
// с Discord форум-каналами (можно перевести на тот же движок, что Дела/BOLO,
// когда определитесь с шаблоном канала для них).

const vehiclesMock = [
  { plate: "ABC123", model: "Buffalo", owner: "John Smith", status: "Не в розыске", color: "Чёрный" },
  { plate: "LSPD-901", model: "Sultan", owner: "LSPD Fleet", status: "Служебный", color: "Белый" }
];

const warrantsMock = [
  { id: "W-2026-014", suspect: "Unknown (Sultan, чёрный)", reason: "Вооружённое ограбление 211 PC", issuedBy: "Phill Graves", status: "Активен" }
];

const officersMockFallback = [
  { nickname: "Phill Graves", rank: "Senior Officer", division: "Patrol", badge: "3-L-21", status: "На смене" },
  { nickname: "Daniel Midnight", rank: "Senior Officer", division: "Patrol", badge: "3-L-22", status: "На смене" }
];

// Памятка сотрудника — статьи кодекса (пример под макет "Угон транспортного средства")
const codexArticles = [
  {
    id: "4.12",
    title: "Угон транспортного средства",
    category: "Транспортные преступления",
    penaltyMonths: 15,
    penaltyFine: 5000,
    confiscation: true,
    description:
      "Лицо умышленно завладело транспортным средством без разрешения владельца с целью временного или постоянного использования.",
    keySigns: [
      "Отсутствие разрешения владельца",
      "Умышленный характер действий",
      "Завладение ТС (любого типа)"
    ],
    related: ["4.11", "4.13"]
  },
  {
    id: "4.13",
    title: "Кража транспортного средства",
    category: "Транспортные преступления",
    penaltyMonths: 18,
    penaltyFine: 6500,
    confiscation: true,
    description: "Тайное хищение транспортного средства с целью его присвоения.",
    keySigns: ["Тайный характер изъятия", "Цель присвоения"],
    related: ["4.11", "4.12"]
  },
  {
    id: "4.11",
    title: "Попытка угона",
    category: "Транспортные преступления",
    penaltyMonths: 6,
    penaltyFine: 2000,
    confiscation: false,
    description: "Попытка завладеть транспортным средством, не доведённая до конца по независящим от лица причинам.",
    keySigns: ["Начатые действия по вскрытию/запуску ТС", "Отсутствие результата"],
    related: ["4.12", "4.13"]
  },
  {
    id: "2.07",
    title: "Управление ТС без водительского удостоверения",
    category: "Транспортные преступления",
    penaltyMonths: 2,
    penaltyFine: 800,
    confiscation: false,
    description: "Управление транспортным средством лицом, не имеющим действующего водительского удостоверения.",
    keySigns: ["Отсутствие ВУ у водителя"],
    related: []
  },
  {
    id: "211",
    title: "Robbery (Вооружённое ограбление)",
    category: "Преступления против собственности",
    penaltyMonths: 24,
    penaltyFine: 10000,
    confiscation: false,
    description: "Открытое хищение имущества с применением или угрозой применения оружия.",
    keySigns: ["Применение/демонстрация оружия", "Открытый характер хищения"],
    related: []
  }
];

const defaultBinder = [
  { action: "Открыть биндер", key: "F2" },
  { action: "Показать удостоверение", key: "F3" },
  { action: "Обыскать человека", key: "F4" },
  { action: "Обыскать автомобиль", key: "F5" },
  { action: "Надеть наручники", key: "F6" },
  { action: "Посадить в транспорт", key: "F7" },
  { action: "Открыть меню взаимодействия", key: "F8" },
  { action: "Вызвать подкрепление (10-20)", key: "F9" },
  { action: "Рация (общий канал)", key: "T" },
  { action: "Рация (диспетчер)", key: "Y" },
  { action: "Сменить канал рации", key: "U" },
  { action: "Открыть КПК", key: "M" }
];

module.exports = { vehiclesMock, warrantsMock, officersMockFallback, codexArticles, defaultBinder };
