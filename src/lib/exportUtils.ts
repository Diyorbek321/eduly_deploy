export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    return;
  }

  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Convert data to CSV string
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        let value = row[fieldName];
        // Handle null/undefined
        if (value === null || value === undefined) {
          value = '';
        }
        // Handle strings with commas or quotes
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""'); // Escape quotes
          if (value.includes(',') || value.includes('\n') || value.includes('"')) {
            value = `"${value}"`;
          }
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
