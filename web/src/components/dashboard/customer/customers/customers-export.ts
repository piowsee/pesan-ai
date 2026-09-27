import { type CustomerContact } from '@/hooks/use-customer-contact';
import * as XLSX from 'xlsx-js-style';

import {
  getCustomerName,
  getCustomerPhone,
  getCustomerUsername,
} from './customers-utils';

const CELL_BORDER = {
  top: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
};
const HEADER_STYLE = {
  border: CELL_BORDER,
  fill: {
    patternType: 'solid',
    fgColor: { rgb: 'E7F2FF' },
  },
  font: {
    bold: true,
    color: { rgb: '12355B' },
  },
  alignment: {
    vertical: 'center',
  },
};
const BODY_STYLE = {
  border: CELL_BORDER,
  alignment: {
    vertical: 'center',
  },
};
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

function applyTableStyles(
  worksheet: XLSX.WorkSheet,
  rowCount: number,
  colCount: number,
) {
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    for (let columnIndex = 0; columnIndex < colCount; columnIndex++) {
      const cellAddress = XLSX.utils.encode_cell({
        r: rowIndex,
        c: columnIndex,
      });
      const cell = worksheet[cellAddress];

      if (!cell) {
        continue;
      }

      if (rowIndex === 0) {
        cell.s = HEADER_STYLE;
        continue;
      }

      cell.s = BODY_STYLE;
    }
  }
}

export function exportCustomersToExcel(
  customers: CustomerContact[],
  headers: string[],
  fallbacks: { noName: string; noUsername: string; noPhone: string },
) {
  const rows: string[][] = [
    [...headers],
    ...customers.map((customer, index) => [
      String(index + 1),
      getCustomerName(customer, fallbacks.noName),
      getCustomerUsername(customer, fallbacks.noUsername),
      getCustomerPhone(customer, fallbacks.noPhone),
    ]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  worksheet['!cols'] = headers.map((_, index) => ({
    wch: getColumnWidth(rows, index),
  }));
  worksheet['!rows'] = rows.map((_, index) => ({ hpt: index === 0 ? 22 : 20 }));
  applyTableStyles(worksheet, rows.length, headers.length);

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
  XLSX.writeFile(workbook, buildExportFilename(), {
    bookType: 'xlsx',
    cellStyles: true,
  });
}
