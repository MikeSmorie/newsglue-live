const PdfPrinter = require('pdfmake');
import { TDocumentDefinitions } from 'pdfmake/interfaces';

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique'
  }
};

const printer = new PdfPrinter(fonts);

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  target: string | null;
  data: any;
  ipAddress: string | null;
}

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  subscriptionPlan?: string;
  twoFactorEnabled?: boolean;
}

export async function generateAuditPdf(data: AuditLogEntry[]): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    content: [
      {
        text: 'Omega-8 Audit Logs Export',
        style: 'header',
        margin: [0, 0, 0, 20]
      },
      {
        text: `Generated: ${new Date().toISOString()}`,
        style: 'subheader',
        margin: [0, 0, 0, 20]
      },
      {
        text: `Total Records: ${data.length}`,
        margin: [0, 0, 0, 20]
      },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Timestamp', style: 'tableHeader' },
              { text: 'Actor', style: 'tableHeader' },
              { text: 'Action', style: 'tableHeader' },
              { text: 'Target', style: 'tableHeader' },
              { text: 'Data', style: 'tableHeader' },
              { text: 'IP Address', style: 'tableHeader' }
            ],
            ...data.map(log => [
              new Date(log.timestamp).toLocaleString(),
              log.actor || 'System',
              log.action,
              log.target || '-',
              typeof log.data === 'object' ? JSON.stringify(log.data).substring(0, 50) + '...' : (log.data || '-'),
              log.ipAddress || '-'
            ])
          ]
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return (rowIndex % 2 === 0) ? '#f3f4f6' : null;
          }
        }
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: '#1f2937'
      },
      subheader: {
        fontSize: 12,
        color: '#6b7280'
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: '#374151',
        fillColor: '#e5e7eb'
      }
    },
    defaultStyle: {
      fontSize: 9
    },
    pageOrientation: 'landscape',
    pageMargins: [40, 60, 40, 60]
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}

export async function generateUserPdf(user: UserRecord): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    content: [
      {
        text: 'Omega-8 User Profile Export',
        style: 'header',
        margin: [0, 0, 0, 20]
      },
      {
        text: `Generated: ${new Date().toISOString()}`,
        style: 'subheader',
        margin: [0, 0, 0, 30]
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'User Information', style: 'sectionHeader', margin: [0, 0, 0, 15] },
              {
                table: {
                  widths: ['30%', '70%'],
                  body: [
                    ['Username:', user.username],
                    ['Email:', user.email || 'Not provided'],
                    ['Role:', user.role.toUpperCase()],
                    ['Account Created:', new Date(user.createdAt).toLocaleDateString()],
                    ['Last Updated:', new Date(user.updatedAt).toLocaleDateString()],
                    ['User ID:', user.id.toString()]
                  ]
                },
                layout: 'noBorders'
              }
            ]
          }
        ]
      },
      {
        text: '\n\nSubscription & Security', 
        style: 'sectionHeader',
        margin: [0, 20, 0, 15]
      },
      {
        table: {
          widths: ['30%', '70%'],
          body: [
            ['Subscription Plan:', (user.subscriptionPlan || 'Free').toUpperCase()],
            ['Two-Factor Auth:', user.twoFactorEnabled ? 'ENABLED' : 'DISABLED'],
            ['Security Level:', user.role === 'supergod' ? 'MAXIMUM' : user.role === 'admin' ? 'HIGH' : 'STANDARD']
          ]
        },
        layout: 'noBorders'
      },
      {
        text: '\n\nExport Information',
        style: 'sectionHeader',
        margin: [0, 30, 0, 15]
      },
      {
        text: `This document contains a complete export of user profile data as of ${new Date().toLocaleDateString()}. For security purposes, sensitive information such as passwords and session tokens are not included in this export.`,
        style: 'disclaimer'
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: '#1f2937'
      },
      subheader: {
        fontSize: 12,
        color: '#6b7280'
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: '#374151'
      },
      disclaimer: {
        fontSize: 10,
        color: '#6b7280',
        italics: true
      }
    },
    defaultStyle: {
      fontSize: 11
    },
    pageMargins: [60, 80, 60, 80]
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}