import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../forms/Button';
import { Input } from '../forms/Input';
import { Select } from '../forms/Select';
import { Search, Filter, Download, Plus } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  pagination?: boolean;
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onExport?: () => void;
  onAdd?: () => void;
  className?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

export function DataTable<T extends Record<string, any>>({
  data = [],
  columns = [],
  loading = false,
  searchable = false,
  filterable = false,
  sortable = false,
  pagination = false,
  onSearch,
  onFilter,
  onSort,
  onExport,
  onAdd,
  className,
  emptyMessage = "Nenhum item encontrado",
  searchPlaceholder = "Pesquisar..."
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortKey, setSortKey] = React.useState<string>('');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleSort = (key: string) => {
    if (!sortable) return;

    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  const renderCell = (item: T, column: Column<T>) => {
    if (column.render) {
      return column.render(item);
    }
    return item[column.key] || '-';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
                size="sm"
              />
            </div>
          )}

          {filterable && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Filter className="w-4 h-4" />}
            >
              Filtros
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={onExport}
            >
              Exportar
            </Button>
          )}

          {onAdd && (
            <Button
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={onAdd}
            >
              Adicionar
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {columns?.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      column.sortable && sortable && 'cursor-pointer hover:bg-gray-100',
                      column.width
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.header}</span>
                      {column.sortable && sortable && sortKey === column.key && (
                        <span className="text-gray-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={columns?.length || 1} className="px-6 py-12 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={columns?.length || 1} className="px-6 py-12 text-center text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {columns?.map((column) => (
                      <td
                        key={column.key}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {renderCell(item, column)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
