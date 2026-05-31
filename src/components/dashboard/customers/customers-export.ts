import { type CustomerPhoneNumber } from '@/hooks/use-phone-number';
import * as XLSX from 'xlsx';

import { getChatLink, getCustomerName } from './customers-utils';

const HEADERS = ['No', 'Nama', 'Nomor', 'Chat'] as const;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function buildExportFilename() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join('-');
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;

  return `customers-${date}-${time}.xlsx`;
}

function getColumnWidth(rows: string[][], columnIndex: number) {
  const longestValue = rows.reduce(
    (max, row) => Math.max(max, row[columnIndex]?.length ?? 0),
    0,
  );

  return Math.min(Math.max(longestValue + 2, 10), 48);
}

export function exportCustomersToExcel(customers: CustomerPhoneNumber[]) {
  const rows: string[][] = [
    [...HEADERS],
    ...customers.map((customer, index) => [
      String(index + 1),
      getCustomerName(customer),
      customer.customerPhone,
      getChatLink(customer.customerPhone),
    ]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  worksheet['!cols'] = HEADERS.map((_, index) => ({
    wch: getColumnWidth(rows, index),
  }));

  customers.forEach((customer, index) => {
    const rowNumber = index + 2;
    const cell = worksheet[`D${rowNumber}`];

    if (cell) {
      cell.l = {
        Target: `https://${getChatLink(customer.customerPhone)}`,
        Tooltip: 'Open WhatsApp chat',
      };
    }
  });

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
  XLSX.writeFile(workbook, buildExportFilename(), {
    bookType: 'xlsx',
    cellStyles: true,
  });
}
