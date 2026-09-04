import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "@/app/layout/AppShell";
import { FeatureSourceListPage } from "@/app/pages/FeatureSourceListPage";
import { WideTableListPage } from "@/app/pages/WideTableListPage";
import {
  CanvasEditRoute,
  CanvasInstanceRoute,
  CanvasNewRoute,
} from "@/app/pages/CanvasPageRoutes";
import { FeatureGroupsLayout } from "@/app/feature-group/FeatureGroupsProvider";
import { FeatureGroupDetailPage } from "@/app/pages/FeatureGroupDetailPage";
import FgServingCanvasPage from "@/app/pages/FgServingCanvasPage";
import { FeatureGroupListPage } from "@/app/pages/FeatureGroupListPage";
import { FeatureMapPage } from "@/app/pages/FeatureMapPage";
import { FeatureMapDetailPage } from "@/app/pages/FeatureMapDetailPage";
import { TaskMonitorPage } from "@/app/pages/TaskMonitorPage";
import { TransformationFormPage } from "@/app/pages/TransformationFormPage";
import { TransformationListPage } from "@/app/pages/TransformationListPage";
import { DataSourceMappingPage } from "@/app/pages/DataSourceMappingPage";

export default function App() {
  return (
    <Routes>
      <Route path="/wt/canvas/new" element={<CanvasNewRoute />} />
      <Route path="/wt/canvas/edit/:tableId" element={<CanvasEditRoute />} />
      <Route
        path="/wt/canvas/instance/:tableId/:instanceId"
        element={<CanvasInstanceRoute />}
      />

      <Route element={<AppShell />}>
        <Route path="/ds" element={<DataSourceMappingPage />} />
        <Route path="/" element={<Navigate to="/wt" replace />} />
        <Route path="/fs" element={<FeatureSourceListPage />} />
        <Route path="/tf" element={<TransformationListPage />} />
        <Route path="/tf/new" element={<TransformationFormPage />} />
        <Route path="/tf/edit/:tfName/:tfVersion" element={<TransformationFormPage />} />
        <Route element={<FeatureGroupsLayout />}>
          <Route path="/fg" element={<FeatureGroupListPage />} />
          <Route path="/fg/:fgId/serving" element={<FgServingCanvasPage />} />
          <Route path="/fg/:fgId" element={<FeatureGroupDetailPage />} />
        </Route>
        <Route path="/fm" element={<FeatureMapPage />} />
        <Route path="/fm/feature/:fqid" element={<FeatureMapDetailPage />} />
        <Route path="/wt" element={<WideTableListPage />} />
        <Route path="/wt/task/:instanceId" element={<TaskMonitorPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/wt" replace />} />
    </Routes>
  );
}
