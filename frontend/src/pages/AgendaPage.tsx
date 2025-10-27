import React from 'react';
import { Calendar, Clock, User, MapPin } from 'lucide-react';

export const AgendaPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <p className="text-sm text-gray-500">Gerencie seus compromissos e reuniões</p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center space-x-4 text-gray-500">
          <Calendar className="w-16 h-16" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Agenda em Desenvolvimento</h2>
            <p className="text-gray-500">
              Esta funcionalidade será implementada em breve.
            </p>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium text-gray-900">Compromissos</h3>
            </div>
            <p className="text-sm text-gray-600">
              Visualize e gerencie seus compromissos diários.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <User className="w-5 h-5 text-green-500" />
              <h3 className="font-medium text-gray-900">Reuniões</h3>
            </div>
            <p className="text-sm text-gray-600">
              Agende e acompanhe reuniões com clientes.
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <MapPin className="w-5 h-5 text-purple-500" />
              <h3 className="font-medium text-gray-900">Lembretes</h3>
            </div>
            <p className="text-sm text-gray-600">
              Configure lembretes para tarefas importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
