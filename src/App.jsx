import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { ScrollToTop } from './components/common/ScrollToTop'
import { AuthorLayout } from './layouts/AuthorLayout'
import { EditorLayout } from './layouts/EditorLayout'
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
import PolicyPage from './pages/PolicyPage'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import CreatePassword from './pages/CreatePassword'
import VerifyEmail from './pages/VerifyEmail'
import OAuthCallback from './pages/OAuthCallback'
import ApplyEditor from './pages/ApplyEditor'
import Journals from './pages/Journals'
import JournalDetails from './pages/JournalDetails'
import JournalArticles from './pages/JournalArticles'
import ArticleDetails from './pages/ArticleDetails'
import Editors from './pages/Editors'
import NotFound from './pages/NotFound'

import AuthorDashboard from './pages/author/AuthorDashboard'
import AuthorSubmit from './pages/author/AuthorSubmit'
import AuthorSubmissions from './pages/author/AuthorSubmissions'
import AuthorManuscriptDetail from './pages/author/AuthorManuscriptDetail'
import AuthorBookmarks from './pages/author/AuthorBookmarks'

import EditorManuscripts from './pages/editor/EditorManuscripts'
import EditorManuscriptDetail from './pages/editor/EditorManuscriptDetail'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminApplications from './pages/admin/AdminApplications'
import AdminEmployees from './pages/admin/AdminEmployees'
import AdminManuscripts from './pages/admin/AdminManuscripts'
import AdminManuscriptDetail from './pages/admin/AdminManuscriptDetail'
import AdminProduction from './pages/admin/AdminProduction'
import AdminInquiries from './pages/admin/AdminInquiries'
import AdminApcWaivers from './pages/admin/AdminApcWaivers'
import AdminSettings from './pages/admin/AdminSettings'
import AdminCatalog from './pages/admin/AdminCatalog'

import { ProtectedRoute } from './auth/ProtectedRoute'
import { ROLES } from './auth/roles'

const ADMIN_ROLES = [ROLES.STAFF, ROLES.SUPER_ADMIN]

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
          <Route path="policies/:slug" element={<PolicyPage />} />
          <Route path="submit" element={<AuthorSubmit />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="create-password" element={<CreatePassword />} />
          <Route path="accept-invite" element={<CreatePassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="auth/oauth/:provider/callback" element={<OAuthCallback />} />
          <Route path="auth/oauth/:provider" element={<OAuthCallback />} />
          <Route path="oauth/callback" element={<OAuthCallback />} />
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

        {/* Author Workspace (/dashboard) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={[ROLES.AUTHOR, ROLES.EDITOR, ROLES.STAFF, ROLES.SUPER_ADMIN]}>
              <AuthorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AuthorDashboard />} />
          <Route path="submit" element={<AuthorSubmit />} />
          <Route path="submissions" element={<AuthorSubmissions />} />
          <Route path="submissions/:manuscriptId" element={<AuthorManuscriptDetail />} />
          <Route path="bookmarks" element={<AuthorBookmarks />} />
        </Route>

        {/* Editor Workspace (/editor) */}
        <Route
          path="/editor"
          element={
            <ProtectedRoute roles={[ROLES.EDITOR, ROLES.SUPER_ADMIN]}>
              <EditorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EditorManuscripts />} />
          <Route path="manuscripts/:manuscriptId" element={<EditorManuscriptDetail />} />
        </Route>

        {/* Staff & Super Admin Workspace (/admin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="manuscripts" element={<AdminManuscripts />} />
          <Route path="manuscripts/:manuscriptId" element={<AdminManuscriptDetail />} />
          <Route path="production" element={<AdminProduction />} />
          <Route path="apc-waivers" element={<AdminApcWaivers />} />
          <Route
            path="employees"
            element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN]}>
                <AdminEmployees />
              </ProtectedRoute>
            }
          />
          <Route
            path="applications"
            element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN]}>
                <AdminApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="inquiries"
            element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN]}>
                <AdminInquiries />
              </ProtectedRoute>
            }
          />
          <Route
            path="catalog"
            element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN]}>
                <AdminCatalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute roles={[ROLES.SUPER_ADMIN]}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </>
  )
}

export default App
