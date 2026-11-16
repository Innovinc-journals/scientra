import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { ScrollToTop } from './components/common/ScrollToTop'
import AuthorSubmit from './pages/author/AuthorSubmit'

import { JournalLayout } from './layouts/JournalLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { JournalPlaceholderPage } from './pages/JournalPlaceholderPage'
import JournalSectionDetails from './pages/JournalSectionDetails'
import JournalAbout from './pages/JournalAbout'

import Home from './pages/Home'
import About from './pages/About'
import MissionAndScope from './pages/about/MissionAndScope'
import OpenAccessStatement from './pages/about/OpenAccessStatement'
import CopyrightStatement from './pages/about/CopyrightStatement'
import EditorialQualityProcesses from './pages/about/EditorialQualityProcesses'
import Contact from './pages/about/Contact'
import WhyPublishWithUs from './pages/authors/WhyPublishWithUs'
import PublishingFees from './pages/authors/PublishingFees'
import ArticleTypes from './pages/authors/ArticleTypes'
import ManuscriptFormatting from './pages/authors/ManuscriptFormatting'
import ReviewGuidelines from './pages/authors/ReviewGuidelines'
import SubmissionChecklist from './pages/authors/SubmissionChecklist'
import News from './pages/News'
import Login from './pages/Login'
import Register from './pages/Register'
import ApplyEditor from './pages/ApplyEditor'
import Journals from './pages/Journals'
import JournalDetails from './pages/JournalDetails'
import JournalArticles from './pages/JournalArticles'
import ArticleDetails from './pages/ArticleDetails'
import Editors from './pages/Editors'
import NotFound from './pages/NotFound'
import AdminApplications from './pages/admin/AdminApplications'
import AdminEmployees from './pages/admin/AdminEmployees'
import AdminManuscripts from './pages/admin/AdminManuscripts'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { useAuth } from './auth/AuthContext'
import { ROLES, roleHome } from './auth/roles'

const ADMIN_ROLES = [ROLES.STAFF, ROLES.SUPER_ADMIN]

// /admin landing: send each role to the first screen it may use.
function AdminIndex() {
  const { user } = useAuth()
  return <Navigate to={roleHome(user?.role)} replace />
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="about">
            <Route index element={<About />} />
            <Route path="mission-and-scope" element={<MissionAndScope />} />
            <Route path="editorial-board" element={<Editors />} />
            <Route path="open-access-statement" element={<OpenAccessStatement />} />
            <Route path="copyright-statement" element={<CopyrightStatement />} />
            <Route path="editorial-quality-processes" element={<EditorialQualityProcesses />} />
            <Route path="contact" element={<Contact />} />
          </Route>
          <Route path="authors">
            <Route path="why-publish-with-us" element={<WhyPublishWithUs />} />
            <Route path="publishing-fees" element={<PublishingFees />} />
            <Route path="article-types" element={<ArticleTypes />} />
            <Route path="manuscript-formatting-guidelines" element={<ManuscriptFormatting />} />
            <Route path="review-guidelines" element={<ReviewGuidelines />} />
            <Route path="submission-checklist" element={<SubmissionChecklist />} />
          </Route>
          <Route path="news" element={<News />} />
          <Route path="submit" element={<AuthorSubmit />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="apply-editor" element={<ApplyEditor />} />
          <Route path="articles" element={<Navigate to="/journals" replace />} />
          <Route path="articles/:articleId" element={<ArticleDetails />} />
          <Route path="journals" element={<Journals />} />

          <Route path="journals/:journalId" element={<JournalLayout />}>
            <Route index element={<JournalDetails />} />
            <Route path="articles" element={<JournalArticles />} />
            <Route path="submit" element={<AuthorSubmit />} />
            <Route path="special-issues" element={<JournalPlaceholderPage title="Special Issues" />} />
            <Route path="special-issues/:issueId" element={<JournalPlaceholderPage />} />
            <Route path="volumes" element={<JournalPlaceholderPage title="Volumes" />} />
            <Route path="volumes/:volumeId" element={<JournalPlaceholderPage />} />
            <Route path="research-topics" element={<JournalPlaceholderPage title="Research Topics" />} />
            <Route path="editorial-board" element={<Editors />} />
            <Route path="sections/:sectionId" element={<JournalSectionDetails />} />
            <Route path="about/:aboutId" element={<JournalAbout />} />
            <Route path="authors/:authorId" element={<JournalPlaceholderPage />} />
            <Route path="reviewers/:reviewerId" element={<JournalPlaceholderPage />} />
            <Route path="community/:communityId" element={<JournalPlaceholderPage />} />
          </Route>

          <Route path="editorial-board" element={<Editors />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndex />} />
          <Route path="employees" element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN]}><AdminEmployees /></ProtectedRoute>} />
          <Route path="applications" element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN]}><AdminApplications /></ProtectedRoute>} />
          <Route path="manuscripts" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminManuscripts /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN]}><JournalPlaceholderPage title="Admin Settings" /></ProtectedRoute>} />
        </Route>
      </Routes>
    </>
  )
}

export default App
