import ClientDetail from './ClientDetail';

const ClientConnectDetail = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
        <ClientDetail embedded initialViewMode="client-connect" />
      </div>
    </div>
  );
};

export default ClientConnectDetail;

