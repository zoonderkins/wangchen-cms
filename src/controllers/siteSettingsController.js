const express = require('express');
const prisma = require('../lib/prisma');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

// Render the site settings form
exports.renderSiteSettingsForm = async (req, res) => {
  try {
    // Get the current settings if they exist
    const settings = await prisma.siteSettings.findFirst();
    
    res.render('admin/site-settings/form', {
      title: 'Site Settings',
      layout: 'layouts/admin',
      settings,
      error_msg: req.flash('error_msg'),
      success_msg: req.flash('success_msg')
    });
  } catch (error) {
    logger.error(`Error rendering site settings form: ${error.message}`, { error });
    req.flash('error_msg', 'Failed to load settings');
    res.redirect('/admin/dashboard');
  }
};

// Save site settings
exports.saveSiteSettings = async (req, res) => {
  try {
    const { 
      site_name_en, 
      site_name_tw, 
      site_url,
      logo_alt_en,
      logo_alt_tw
    } = req.body;

    // Prepare data object
    const data = {
      site_name_en,
      site_name_tw,
      site_url,
      logo_alt_en,
      logo_alt_tw
    };

    // Process logo uploads if they exist
    if (req.files) {
      if (req.files.logo_desktop) {
        data.logo_desktop_path = req.files.logo_desktop[0].path.replace(/\\/g, '/');
      }

      if (req.files.logo_tablet) {
        data.logo_tablet_path = req.files.logo_tablet[0].path.replace(/\\/g, '/');
      }

      if (req.files.logo_mobile) {
        data.logo_mobile_path = req.files.logo_mobile[0].path.replace(/\\/g, '/');
      }
    }

    // Check if settings already exist
    const existingSettings = await prisma.siteSettings.findFirst();

    if (existingSettings) {
      // Update existing settings
      await prisma.siteSettings.update({
        where: { id: existingSettings.id },
        data
      });
    } else {
      // Create new settings
      await prisma.siteSettings.create({ data });
    }

    req.flash('success_msg', 'Site settings saved successfully');
    res.redirect('/admin/site-settings');
  } catch (error) {
    logger.error(`Error saving site settings: ${error.message}`, { error });
    req.flash('error_msg', 'Failed to save settings');
    res.redirect('/admin/site-settings');
  }
};

// API endpoint to get site settings
exports.getSiteSettings = async (req, res) => {
  try {
    const settings = await prisma.siteSettings.findFirst();
    res.json(settings || {});
  } catch (error) {
    logger.error(`Error fetching site settings: ${error.message}`, { error });
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
}; 
