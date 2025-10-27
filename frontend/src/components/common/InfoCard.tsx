
interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  className?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  children,
  icon,
  variant = 'default',
  className = ''
}) => {
  const variants = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-orange-50 border-orange-200',
    info: 'bg-custom-blue-light border-custom-blue'
  };

  return (
    <div className={`rounded-lg p-4 border ${variants[variant]} ${className}`}>
      <div className="flex items-center mb-3">
        {icon && <span className="mr-2">{icon}</span>}
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
      </div>
      {children}
    </div>
  );
};
