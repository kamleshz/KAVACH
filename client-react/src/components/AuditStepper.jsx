import { motion } from 'framer-motion';

const getStatus = (stepNumber, currentStep) => {
  if (stepNumber < currentStep) return 'completed';
  if (stepNumber === currentStep) return 'active';
  return 'upcoming';
};

const AuditStepper = ({ steps, currentStep, onStepChange }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {steps.map((step) => {
          const status = getStatus(step.number, currentStep);
          const isCompleted = status === 'completed';
          const isActive = status === 'active';
          const isUpcoming = status === 'upcoming';

          const containerClasses = [
            'flex-1 flex items-center justify-between px-5 py-4 text-left transition-colors duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary-500',
            isCompleted && 'bg-emerald-50',
            isActive && 'bg-orange-50',
            isUpcoming && 'bg-white',
          ]
            .filter(Boolean)
            .join(' ');

          const titleClasses = [
            'text-sm font-semibold',
            isCompleted && 'text-emerald-800',
            isActive && 'text-orange-800',
            isUpcoming && 'text-gray-700',
          ]
            .filter(Boolean)
            .join(' ');

          const iconCircleClasses = [
            'flex h-10 w-10 items-center justify-center rounded-full',
            isCompleted && 'bg-emerald-500 text-white',
            isActive && 'bg-orange-500 text-white',
            isUpcoming && 'bg-gray-100 text-gray-400',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <motion.button
              key={step.number}
              type="button"
              onClick={() => onStepChange && onStepChange(step.number)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className={containerClasses}
            >
              <div className="flex items-center gap-3">
                <div className={iconCircleClasses}>
                  {typeof step.icon === 'string' ? (
                    <i className={`${step.icon || 'fas fa-circle-user'} text-lg`} />
                  ) : (
                    step.icon
                  )}
                </div>
                <div>
                  <p className={titleClasses}>{step.title}</p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-center pl-4">
                {isCompleted && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <i className="fas fa-check text-xs" />
                  </div>
                )}
                {isActive && (
                  <motion.div
                    className="relative flex h-7 w-7 items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="absolute h-6 w-6 rounded-full bg-orange-100" />
                    <div className="relative h-3 w-3 rounded-full bg-orange-500" />
                  </motion.div>
                )}
                {isUpcoming && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300">
                    <div className="h-3 w-3 rounded-full bg-gray-200" />
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default AuditStepper;

