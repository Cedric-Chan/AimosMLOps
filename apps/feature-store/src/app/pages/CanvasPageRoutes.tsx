import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import { CanvasPage } from "@/app/components/CanvasPage";
import type { WideTableFormValues } from "@/app/components/AddWideTableModal";
import { getWideTableById } from "@/data/mockWideTables";
import type { WideTableCanvasSnapshot } from "@/data/widetableCanvasModel";

export function CanvasNewRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const st = location.state as {
    formValues?: WideTableFormValues;
    canvasSnapshot?: WideTableCanvasSnapshot;
  } | null;
  const formValues = st?.formValues;
  if (!formValues) {
    return <Navigate to="/wt" replace />;
  }
  return (
    <CanvasPage
      mode="new"
      formValues={formValues}
      canvasSnapshot={st?.canvasSnapshot}
      onBack={() => navigate("/wt")}
    />
  );
}

export function CanvasEditRoute() {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  const row = tableId ? getWideTableById(tableId) : undefined;
  if (!row) {
    return <Navigate to="/wt" replace />;
  }
  return (
    <CanvasPage mode="edit" row={row} onBack={() => navigate("/wt")} />
  );
}

export function CanvasInstanceRoute() {
  const navigate = useNavigate();
  const { tableId, instanceId } = useParams<{
    tableId: string;
    instanceId: string;
  }>();
  const row = tableId ? getWideTableById(tableId) : undefined;
  const decodedInstanceId = instanceId ? decodeURIComponent(instanceId) : "";
  if (!row || !decodedInstanceId) {
    return <Navigate to="/wt" replace />;
  }
  return (
    <CanvasPage
      mode="instance"
      row={row}
      initialInstanceId={decodedInstanceId}
      onBack={() => navigate("/wt")}
    />
  );
}
