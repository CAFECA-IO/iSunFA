import Image from 'next/image';
import { FiSearch, FiEdit, FiTrash2, FiShare2 } from 'react-icons/fi';
import { IoAdd } from 'react-icons/io5';
import { Button } from '@/components/button/button';
import { ITodoEvent } from '@/interfaces/todo';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';

// ToDo: (20241106 - Liz) 使用共用元件代替 Search
// import FilterSection from '@/components/filter_section/filter_section';
// import { IPaginatedData } from '@/interfaces/pagination';

const TO_DO_LIST: ITodoEvent[] = [
  {
    id: 1,
    name: 'Voucher organization case',
    deadline: 1729958400,
    note: 'Test Note',
    status: false,
    createdAt: 1727712000,
    updatedAt: 1727712000,
    deletedAt: 0,
    userTodoCompanies: [
      {
        id: 1,
        name: 'Company A',
        taxId: '12345678',
        startDate: 1727712000,
        createdAt: 1727712000,
        updatedAt: 1727712000,
        tag: 'tag',
        imageId: '/images/fake_company_log_01.png',
      },
    ],
  },
  {
    id: 2,
    name: 'Voucher organization case',
    deadline: 1730044800,
    note: 'Test Note',
    status: false,
    createdAt: 1727712000,
    updatedAt: 1727712000,
    deletedAt: 0,
    userTodoCompanies: [
      {
        id: 1,
        name: 'Company A',
        taxId: '12345678',
        startDate: 1727712000,
        createdAt: 1727712000,
        updatedAt: 1727712000,
        tag: 'tag',
        imageId: '/images/fake_company_log_01.png',
      },
    ],
  },
  {
    id: 3,
    name: 'Close Meeting',
    deadline: 1730131200,
    note: 'Test Note',
    status: false,
    createdAt: 1727712000,
    updatedAt: 1727712000,
    deletedAt: 0,
    userTodoCompanies: [],
  },
  {
    id: 4,
    name: 'Voucher organization case',
    deadline: 1730217600,
    note: 'Test Note',
    status: false,
    createdAt: 1727712000,
    updatedAt: 1727712000,
    deletedAt: 0,
    userTodoCompanies: [
      {
        id: 1,
        name: 'Company C',
        taxId: '12345678',
        startDate: 1727712000,
        createdAt: 1727712000,
        updatedAt: 1727712000,
        tag: 'tag',
        imageId: '/images/fake_company_log_03.png',
      },
    ],
  },
  {
    id: 5,
    name: 'Voucher organization case',
    deadline: 1730304000,
    note: 'Test Note 2',
    status: false,
    createdAt: 1727712000,
    updatedAt: 1727712000,
    deletedAt: 0,
    userTodoCompanies: [
      {
        id: 1,
        name: 'Company B',
        taxId: '12345678',
        startDate: 1727712000,
        createdAt: 1727712000,
        updatedAt: 1727712000,
        tag: 'tag',
        imageId: '/images/fake_company_log_02.png',
      },
    ],
  },
  {
    id: 6,
    name: 'Voucher organization case',
    deadline: 1730304000,
    note: 'Test Note 2',
    status: false,
    createdAt: 1727712000,
    updatedAt: 1727712000,
    deletedAt: 0,
    userTodoCompanies: [
      {
        id: 1,
        name: 'Company B',
        taxId: '12345678',
        startDate: 1727712000,
        createdAt: 1727712000,
        updatedAt: 1727712000,
        tag: 'tag',
        imageId: '/images/fake_company_log_02.png',
      },
    ],
  },
  {
    id: 7,
    name: 'Voucher organization case',
    deadline: 1730304000,
    note: 'Test Note 2',
    status: false,
    createdAt: 1727712000,
    updatedAt: 1727712000,
    deletedAt: 0,
    userTodoCompanies: [
      {
        id: 1,
        name: 'Company B',
        taxId: '12345678',
        startDate: 1727712000,
        createdAt: 1727712000,
        updatedAt: 1727712000,
        tag: 'tag',
        imageId: '/images/fake_company_log_02.png',
      },
    ],
  },
  {
    id: 8,
    name: 'Voucher organization case',
    deadline: 1730304000,
    note: 'Test Note 2',
    status: false,
    createdAt: 1727712000,
    updatedAt: 1727712000,
    deletedAt: 0,
    userTodoCompanies: [
      {
        id: 1,
        name: 'Company B',
        taxId: '12345678',
        startDate: 1727712000,
        createdAt: 1727712000,
        updatedAt: 1727712000,
        tag: 'tag',
        imageId: '/images/fake_company_log_02.png',
      },
    ],
  },
];

const NoData = () => {
  return (
    <div className="flex flex-auto flex-col items-center justify-center gap-16px border-2 border-lime-300">
      <Image src={'/images/empty.svg'} alt="no_data" width={120} height={134.787}></Image>

      <p>No pending tasks</p>
    </div>
  );
};

const ToDoEvent = ({ toDoEvent }: { toDoEvent: ITodoEvent }) => {
  return (
    <section className="flex bg-surface-neutral-surface-lv2">
      <div className="flex w-120px items-center justify-center px-16px pb-8px pt-16px">
        <CalendarIcon timestamp={toDoEvent.deadline} />
      </div>

      <div className="flex grow items-center justify-center truncate px-16px py-8px text-base font-semibold text-surface-brand-secondary">
        <p>{toDoEvent.name}</p>
      </div>

      <div className="flex w-160px items-center justify-center px-16px py-8px text-xs font-semibold text-text-neutral-primary">
        {toDoEvent.userTodoCompanies.length === 0 ? (
          <h5 className="text-center">No Company</h5>
        ) : (
          toDoEvent.userTodoCompanies.map((company) => (
            <div className="flex items-center justify-center gap-8px">
              <Image src={company.imageId} width={24} height={24} alt="company_logo"></Image>
              <h5 className="truncate">{company.name}</h5>
            </div>
          ))
        )}
      </div>

      <div className="flex w-160px items-center justify-center gap-12px px-16px py-8px text-center text-xs font-medium text-icon-surface-single-color-primary">
        <button type="button">
          <FiEdit size={16} />
        </button>
        <button type="button">
          <FiShare2 size={16} />
        </button>
        <button type="button">
          <FiTrash2 size={16} />
        </button>
      </div>
    </section>
  );
};

const ToDoList = ({ toDoEvents }: { toDoEvents: ITodoEvent[] }) => {
  return (
    <div className="overflow-hidden rounded-md border shadow-Dropshadow_XS">
      <section className="flex items-center divide-x-2 divide-stroke-neutral-quaternary bg-surface-brand-secondary-5">
        <div className="w-120px px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
          Deadline
        </div>
        <div className="grow px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
          Event Name
        </div>
        <div className="w-160px px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
          Affiliated Company
        </div>
        <div className="w-160px px-16px py-8px text-center text-xs font-medium text-text-brand-secondary-lv2">
          Action
        </div>
      </section>

      {toDoEvents.map((toDoEvent) => (
        <ToDoEvent key={toDoEvent.id} toDoEvent={toDoEvent} />
      ))}
    </div>
  );
};

const ToDoListPageBody = () => {
  const isNoData = TO_DO_LIST.length === 0;

  const handleAddEvent = () => {
    // Deprecated: (20241106 - Liz)
    // eslint-disable-next-line no-console
    console.log('Add Event');
  };
  return (
    <main className="flex min-h-full flex-col gap-40px">
      <section className="flex items-center gap-40px">
        <div className="flex flex-auto items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background">
          <input
            type="text"
            placeholder="Search"
            className="grow rounded-l-sm bg-transparent px-12px py-10px outline-none"
          />

          <button type="button" className="px-12px py-10px">
            <FiSearch size={20} />
          </button>
        </div>

        <Button variant="tertiary" size="default" onClick={handleAddEvent}>
          <IoAdd size={20} />
          <p>Add Event</p>
        </Button>
      </section>

      <section className="flex items-center gap-16px">
        <div className="flex items-center gap-8px">
          <Image src={'/icons/event_list.svg'} width={16} height={16} alt="event_list"></Image>
          <h3>Event List</h3>
        </div>

        <div className="h-1px grow bg-divider-stroke-lv-1"></div>
      </section>

      {isNoData ? <NoData /> : <ToDoList toDoEvents={TO_DO_LIST} />}
    </main>
  );
};

export default ToDoListPageBody;
