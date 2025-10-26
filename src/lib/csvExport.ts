export const exportToCSV = (data: any[], filename: string, headers: string[]) => {
  if (data.length === 0) {
    return;
  }

  // Create CSV header
  const csvHeader = headers.join(',') + '\n';

  // Create CSV rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle nested objects and arrays
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(value ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  }).join('\n');

  // Combine header and rows
  const csvContent = csvHeader + csvRows;

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
